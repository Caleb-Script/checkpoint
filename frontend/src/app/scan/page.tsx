// /Users/gentlebookpro/Projekte/checkpoint/frontend/srv/app/scan/page.tsx
'use client';

import { useMutation } from '@apollo/client';
import {
  BarcodeFormat,
  // LensFacing, // optional
  BarcodeScanner as MLKitScanner,
  type ScanResult as MLKitScanResult,
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { HANDLE_SCAN } from '../../graphql/ticket/mutation';
import './scan.css';

/* ──────────────────────────────────────────────────────────────────────────────
   Zusätzliche DOM/Media-Typen (ohne any)
   ────────────────────────────────────────────────────────────────────────────── */
declare global {
  interface BarcodeDetectorOptions {
    formats?: string[];
  }
  interface DetectedBarcode {
    rawValue: string;
  }
  interface BarcodeDetector {
    detect(
      source:
        | HTMLVideoElement
        | HTMLImageElement
        | ImageBitmap
        | HTMLCanvasElement,
    ): Promise<DetectedBarcode[]>;
  }
  interface BarcodeDetectorConstructor {
    new (options?: BarcodeDetectorOptions): BarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
  }
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
  // Torch-Fähigkeit für Kameras
  interface MediaTrackCapabilities {
    torch?: boolean;
  }
}

// Präsenz-Status wie im Prisma-Model
type PresenceState = 'INSIDE' | 'OUTSIDE';
type ScanResult = {
  id: string;
  eventId: string;
  seatId?: string | null;
  currentState: PresenceState;
  revoked?: boolean;
  deviceBoundKey?: string | null;
};
type HandleScanPayload = { handleScan: ScanResult };

/* ──────────────────────────────────────────────────────────────────────────────
   Haptik & Beep
   ────────────────────────────────────────────────────────────────────────────── */
async function doHaptic(
  kind: 'success' | 'error' | 'impact' = 'impact',
): Promise<void> {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import(
      '@capacitor/haptics'
    );
    if (kind === 'success')
      await Haptics.notification({ type: NotificationType.Success });
    else if (kind === 'error')
      await Haptics.notification({ type: NotificationType.Error });
    else await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* no-op */
  }
}

async function playBeep(
  kind: 'success' | 'error' | 'scan' = 'scan',
): Promise<void> {
  try {
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const conf = {
      scan: { freq: 900, dur: 0.08, vol: 0.03 },
      success: { freq: 720, dur: 0.12, vol: 0.035 },
      error: { freq: 220, dur: 0.18, vol: 0.045 },
    }[kind];
    osc.type = 'sine';
    osc.frequency.value = conf.freq;
    gain.gain.value = conf.vol;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + conf.dur);
    window.setTimeout(
      () => void ctx.close().catch(() => undefined),
      Math.ceil((conf.dur + 0.05) * 1000),
    );
  } catch {
    /* no-op */
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   Web-Capabilities & Utils
   ────────────────────────────────────────────────────────────────────────────── */
function hasMediaDevices(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}
function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && !!window.BarcodeDetector;
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/* ──────────────────────────────────────────────────────────────────────────────
   React-Komponente
   ────────────────────────────────────────────────────────────────────────────── */
export default function ScanPage(): React.JSX.Element {
  const [token, setToken] = React.useState('');
  const [gate, _setGate] = React.useState('MAIN');
  const [direction, setDirection] = React.useState<PresenceState>('INSIDE');

  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Web-Livekamera (nur Browser/PWA)
  const [cameraActive, setCameraActive] = React.useState(false);
  const [loadingCam, setLoadingCam] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  const RECENT_WINDOW_MS = 3000;
  const recentMapRef = React.useRef<Map<number, number>>(new Map());

  const [handleScanMutation] = useMutation<HandleScanPayload>(HANDLE_SCAN);

  const shouldIgnore = (qrText: string): boolean => {
    const now = Date.now();
    const key = hashCode(qrText);
    const last = recentMapRef.current.get(key);
    if (last && now - last < RECENT_WINDOW_MS) return true;
    recentMapRef.current.set(key, now);
    return false;
  };

  const trySubmit = async (jwt: string): Promise<void> => {
    if (!jwt?.trim()) return;
    if (shouldIgnore(jwt)) {
      setResult({
        id: '—',
        eventId: '—',
        seatId: null,
        currentState: direction,
      });
      setError(null);
      return;
    }
    setError(null);
    setResult(null);
    void playBeep('scan');
    await doHaptic('impact');

    try {
      const res = await handleScanMutation({ variables: { token: jwt } });
      const data = res.data?.handleScan ?? null;
      if (data) setResult(data);
      await doHaptic('success');
      await playBeep('success');
      setToken('');
    } catch (e) {
      const msg =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Scan fehlgeschlagen.';
      setResult(null);
      setError(msg);
      await doHaptic('error');
      await playBeep('error');
    }
  };

  /* =================== A) Nativ (iOS/Android) via ML Kit =================== */
  const isNativeApp = Capacitor.getPlatform() !== 'web';

  const startNativeScan = async (): Promise<void> => {
    setError(null);
    try {
      const res: MLKitScanResult = await MLKitScanner.scan({
        formats: [BarcodeFormat.QrCode],
        // lensFacing: LensFacing.Back,
      });
      const content = res.barcodes?.[0]?.rawValue ?? '';
      if (content) {
        await trySubmit(content);
      } else {
        setError('Kein QR-Code erkannt.');
      }
    } catch (e) {
      const msg =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Native Scan fehlgeschlagen.';
      setError(msg);
    }
  };

  /* =================== B) Web-Livekamera (Browser/PWA) ===================== */
  function detectTorchSupport(): boolean {
    const track = streamRef.current?.getVideoTracks?.()[0];
    try {
      const caps = track?.getCapabilities?.();
      const supported = !!(caps && typeof caps.torch !== 'undefined');
      setTorchSupported(supported);
      return supported;
    } catch {
      setTorchSupported(false);
      return false;
    }
  }

  const setTorch = async (on: boolean): Promise<void> => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      // ohne @ts-expect-error: sauberer Typ via Intersection
      const torchAdvanced: MediaTrackConstraintSet & { torch?: boolean } = {
        torch: on,
      };
      const constraints: MediaTrackConstraints = { advanced: [torchAdvanced] };
      await track.applyConstraints(constraints);
      setTorchOn(on);
    } catch {
      setTorchOn(false);
    }
  };

  async function requestStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }
  }

  const startWithBarcodeDetector = async (
    video: HTMLVideoElement,
  ): Promise<boolean> => {
    if (!hasBarcodeDetector() || !window.BarcodeDetector) return false;
    const formats = await window.BarcodeDetector.getSupportedFormats();
    const canQR = formats.includes('qr_code');
    const detector = new window.BarcodeDetector({
      formats: canQR ? ['qr_code'] : undefined,
    });

    const loop = async (): Promise<void> => {
      if (!video) return;
      try {
        const det = await detector.detect(video);
        const text = det.length > 0 ? det[0].rawValue : undefined;
        if (text) {
          await trySubmit(text);
          await new Promise((r) => window.setTimeout(r, 300));
        }
      } catch {
        /* frame ohne Code */
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    void loop();
    return true;
  };

  const startWebCamera = async (): Promise<void> => {
    if (cameraActive) return;
    setLoadingCam(true);
    setError(null);
    try {
      if (!hasMediaDevices()) {
        setError(
          'Live-Kamera wird hier nicht unterstützt. Nutze den nativen Scan in der App.',
        );
        return;
      }
      const stream = await requestStream();
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Kein Videoelement');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      void detectTorchSupport();
      const ok = videoRef.current
        ? await startWithBarcodeDetector(videoRef.current)
        : false;
      if (!ok) setError('Dieser Browser unterstützt keinen BarcodeDetector.');
    } catch (e) {
      const msg =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Kamera konnte nicht geöffnet werden';
      setError(msg);
    } finally {
      setLoadingCam(false);
    }
  };

  const stopWebCamera = (): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks()?.forEach((t) => {
      try {
        t.stop();
      } catch {
        /* no-op */
      }
    });
    streamRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    setCameraActive(false);
  };

  React.useEffect(() => () => stopWebCamera(), []);

  /* ──────────────────────────────────────────────────────────────────────────
     Render
     ────────────────────────────────────────────────────────────────────────── */
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          QR-Scanner
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          In der nativen iOS/Android-App nutzt „Nativer Scan“ die echte
          Kameravorschau. Im Browser/PWA: „Kamera starten“ (falls unterstützt).
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <ToggleButtonGroup
            exclusive
            value={direction}
            onChange={(_, v) => v && setDirection(v)}
            size="small"
          >
            <ToggleButton value="INSIDE">Einlass</ToggleButton>
            <ToggleButton value="OUTSIDE">Auslass</ToggleButton>
          </ToggleButtonGroup>
          <Chip size="small" label="Dedupe: 3 Sek." />
          <Chip size="small" label={`Gate: ${gate}`} />
          {cameraActive && (
            <>
              {torchSupported ? (
                <Tooltip
                  title={torchOn ? 'Taschenlampe aus' : 'Taschenlampe an'}
                >
                  <IconButton
                    aria-label="Torch"
                    onClick={() => void setTorch(!torchOn)}
                    size="small"
                  >
                    {torchOn ? <FlashOffIcon /> : <FlashOnIcon />}
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Torch nicht unterstützt">
                  <span>
                    <IconButton size="small" disabled>
                      <FlashOffIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </>
          )}
        </Stack>

        {/* Live-Kamera (nur Web/PWA) */}
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'black',
            mb: 1,
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: 'auto',
              display: cameraActive ? 'block' : 'none',
            }}
            muted
            playsInline
          />
          {!cameraActive && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              {loadingCam ? (
                <Stack alignItems="center" spacing={1}>
                  <CircularProgress size={28} />
                  <Typography>Kamera wird gestartet…</Typography>
                </Stack>
              ) : (
                <Typography>
                  Nutze „Nativer Scan“ in der App oder „Kamera starten“ im
                  Browser.
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* Ergebnis / Fehler */}
        {result && (
          <Alert severity="success" sx={{ mb: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Ticket</Typography>
              <Typography variant="body2">
                ID: <code>{result.id}</code> · Event:{' '}
                <code>{result.eventId}</code> · Sitz:{' '}
                <code>{result.seatId || '—'}</code>
              </Typography>
              <Typography variant="body2">
                Status: <strong>{result.currentState}</strong>
                {result.revoked ? ' · REVOKED' : ''}
              </Typography>
              {result.deviceBoundKey && (
                <Typography variant="caption" color="text.secondary">
                  DeviceKey: <code>{result.deviceBoundKey}</code>
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                ({direction} @ {gate})
              </Typography>
            </Stack>
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Manuell
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1 }}
          useFlexGap
        >
          <TextField
            label="QR-Token (JWT)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
          />
          <Button
            onClick={() => void trySubmit(token)}
            variant="contained"
            disabled={!token.trim()}
          >
            Buchen
          </Button>
        </Stack>
      </CardContent>

      <CardActions>
        {isNativeApp && (
          <Button variant="contained" onClick={() => void startNativeScan()}>
            Nativer Scan (ML Kit)
          </Button>
        )}
        {!cameraActive ? (
          <Button
            onClick={() => void startWebCamera()}
            variant="outlined"
            disabled={loadingCam}
          >
            Kamera starten (Web)
          </Button>
        ) : (
          <Button onClick={stopWebCamera} variant="outlined" color="warning">
            Kamera stoppen
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

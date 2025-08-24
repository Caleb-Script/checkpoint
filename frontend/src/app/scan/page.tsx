// /web/src/app/scan/page.tsx
'use client';

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

// Optional Fallback: @zxing/browser – wird nur dynamisch importiert, wenn BarcodeDetector fehlt
type ZXingReader = {
  BrowserMultiFormatReader: new () => {
    decodeFromVideoDevice: (
      deviceId: string | null,
      video: HTMLVideoElement,
      cb: (result: any, err: any, controls: { stop: () => void }) => void,
    ) => { stop: () => void };
    reset: () => void;
  };
};

// Haptik util: versucht Capacitor Haptics, sonst navigator.vibrate
async function doHaptic(kind: 'success' | 'error' | 'impact' = 'impact') {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import(
      '@capacitor/haptics'
    );
    if (kind === 'success') {
      await Haptics.notification({ type: NotificationType.SUCCESS });
    } else if (kind === 'error') {
      await Haptics.notification({ type: NotificationType.ERROR });
    } else {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (kind === 'success') navigator.vibrate?.(30);
      else if (kind === 'error') navigator.vibrate?.([30, 40, 30]);
      else navigator.vibrate?.(20);
    }
  }
}

// Akustik util: WebAudio‑Beep (keine zusätzlichen Assets nötig)
async function playBeep(kind: 'success' | 'error' | 'scan' = 'scan') {
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // unterschiedliche Tonhöhen/Längen
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
    // Auto‑close nach kurzer Zeit
    setTimeout(() => ctx.close().catch(() => {}), (conf.dur + 0.05) * 1000);
  } catch {
    // ignore
  }
}

// einfache Hash‑Funktion für Dedupe (Text → Zahl)
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export default function ScanPage() {
  const [token, setToken] = React.useState('');
  const [gate, setGate] = React.useState('MAIN');
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState<'INSIDE' | 'OUTSIDE'>(
    'INSIDE',
  );

  // Kamera / Decoder
  const [cameraActive, setCameraActive] = React.useState(false);
  const [loadingCam, setLoadingCam] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const stopZxingRef = React.useRef<(() => void) | null>(null);

  // Torch
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  // Dedupe‑Cache: QR‑Text‑Hash → timestamp ms
  const RECENT_WINDOW_MS = 3000; // 3s: in diesem Zeitfenster gleiche Codes ignorieren
  const recentMapRef = React.useRef<Map<number, number>>(new Map());

  const stopCamera = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (stopZxingRef.current) {
      try {
        stopZxingRef.current();
      } catch {}
    }
    stopZxingRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setCameraActive(false);
    setTorchSupported(false);
  }, []);

  React.useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // periodisch alten Dedupe‑Cache aufräumen
  React.useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const map = recentMapRef.current;
      for (const [k, ts] of map) {
        if (now - ts > RECENT_WINDOW_MS) map.delete(k);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const getVideoTrack = () => {
    const stream = streamRef.current;
    if (!stream) return null;
    const tracks = stream.getVideoTracks();
    return tracks.length ? tracks[0] : null;
  };

  const detectTorchSupport = () => {
    const track = getVideoTrack();
    try {
      const caps = (track as any)?.getCapabilities?.();
      const supported = !!(caps && 'torch' in caps);
      setTorchSupported(supported);
      return supported;
    } catch {
      setTorchSupported(false);
      return false;
    }
  };

  const setTorch = async (on: boolean) => {
    const track = getVideoTrack();
    if (!track) return;
    try {
      // @ts-ignore - TS kennt torch (noch) nicht
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setTorchOn(on);
    } catch {
      setTorchOn(false);
    }
  };

  // zentrale Dedupe‑Prüfung
  const shouldIgnore = (qrText: string): boolean => {
    const now = Date.now();
    const key = hashCode(qrText);
    const last = recentMapRef.current.get(key);
    if (last && now - last < RECENT_WINDOW_MS) {
      return true; // innerhalb des Fensters: ignorieren
    }
    recentMapRef.current.set(key, now);
    return false;
  };

  const trySubmit = async (jwt: string) => {
    if (!jwt?.trim()) return;
    // Dedupe vor dem Request
    if (shouldIgnore(jwt)) {
      setResult('Duplikat innerhalb 3 Sek. ignoriert');
      setError(null);
      return;
    }

    setError(null);
    setResult(null);

    // kurzes Scan‑Beep bei Erkennung (auch wenn Request noch läuft)
    playBeep('scan').catch(() => {});

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: jwt, gate, direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        await doHaptic('error');
        await playBeep('error');
        throw new Error(data?.error ?? 'Fehler');
      }
      setResult(data?.verdict ?? 'OK');
      await doHaptic('success');
      await playBeep('success');
      setToken('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startWithBarcodeDetector = async (video: HTMLVideoElement) => {
    // @ts-expect-error: experimental global
    const Supported =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;
    if (!Supported) return false;

    // @ts-expect-error: experimental global
    const formats = await (
      window.BarcodeDetector as any
    ).getSupportedFormats?.();
    const canQR = formats?.includes?.('qr_code') ?? true;
    // @ts-expect-error: experimental global
    const detector = new window.BarcodeDetector({
      formats: canQR ? ['qr_code'] : undefined,
    });

    const loop = async () => {
      if (!videoRef.current) return;
      try {
        const det = await detector.detect(videoRef.current);
        const text = det?.[0]?.rawValue;
        if (text) {
          await trySubmit(text);
          // kleine Pause, um zu viele Frames nicht zu spammen
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        // kein Code im Frame – ignorieren
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return true;
  };

  const startWithZXing = async (video: HTMLVideoElement) => {
    const mod = (await import('@zxing/browser')) as unknown as ZXingReader;
    const reader = new mod.BrowserMultiFormatReader();
    const controls = reader.decodeFromVideoDevice(
      null,
      video,
      async (res, err, ctrl) => {
        if (res?.getText) {
          const text = res.getText();
          await trySubmit(text);
        }
        if (err) {
          // kein Code – ignoriere
        }
        stopZxingRef.current = () => {
          try {
            ctrl.stop();
          } catch {}
          try {
            reader.reset();
          } catch {}
        };
      },
    );
    stopZxingRef.current = () => {
      try {
        controls.stop();
      } catch {}
      try {
        reader.reset();
      } catch {}
    };
  };

  const startCamera = async () => {
    if (cameraActive) return;
    setLoadingCam(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Kein Videoelement');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);

      // Torch-Fähigkeit prüfen
      detectTorchSupport();

      // Erst BarcodeDetector, sonst ZXing
      const ok = await startWithBarcodeDetector(videoRef.current);
      if (!ok) await startWithZXing(videoRef.current);
    } catch (e: any) {
      setError(e?.message ?? 'Kamera konnte nicht geöffnet werden');
      await doHaptic('error');
      await playBeep('error');
      stopCamera();
    } finally {
      setLoadingCam(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          QR‑Scanner
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Scanne rotierende QR‑Tokens. Bei fehlender Kamera kannst du das JWT
          auch manuell einfügen.
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

          <Chip size="small" label="Dedupe: 3 Sek." />

          {cameraActive && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`Gate: ${gate}`} />
              {torchSupported ? (
                <Tooltip
                  title={
                    torchOn
                      ? 'Taschenlampe ausschalten'
                      : 'Taschenlampe einschalten'
                  }
                >
                  <IconButton
                    aria-label="Torch"
                    onClick={() => setTorch(!torchOn)}
                    size="small"
                  >
                    {torchOn ? <FlashOffIcon /> : <FlashOnIcon />}
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Torch vom Gerät/Browser nicht unterstützt">
                  <span>
                    <IconButton size="small" disabled>
                      <FlashOffIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1 }}
        >
          <TextField
            label="Gate"
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            sx={{ minWidth: 140 }}
          />
        </Stack>

        {/* Kamera-Viewport mit Guideline-Overlay */}
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
                <Typography>Tippe „Kamera starten“, um zu scannen.</Typography>
              )}
            </Box>
          )}

          {/* Guideline-Maske: dunkelt außen ab, mit hellem Rahmen + Corner-Marks */}
          {cameraActive && (
            <>
              {/* Außenmaske */}
              <Box
                sx={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  inset: 0,
                  ['--frameSize' as any]: 'min(70vw, 380px)',
                  WebkitMask:
                    'radial-gradient(circle at center, transparent calc(var(--frameSize)/2), black calc(var(--frameSize)/2 + 1px))',
                  mask: 'radial-gradient(circle at center, transparent calc(var(--frameSize)/2), black calc(var(--frameSize)/2 + 1px))',
                  backgroundColor: 'rgba(0,0,0,0.45)',
                }}
              />
              {/* Rahmen */}
              <Box
                sx={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 'min(70vw, 380px)',
                  height: 'min(70vw, 380px)',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 3,
                  border: '2px solid rgba(255,255,255,0.85)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2) inset',
                }}
              />
              {/* Corner-Marks */}
              {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
                <Box
                  key={pos}
                  sx={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    top: pos.includes('t')
                      ? 'calc(50% - min(35vw, 190px))'
                      : 'auto',
                    bottom: pos.includes('b')
                      ? 'calc(50% - min(35vw, 190px))'
                      : 'auto',
                    left: pos.includes('l')
                      ? 'calc(50% - min(35vw, 190px))'
                      : 'auto',
                    right: pos.includes('r')
                      ? 'calc(50% - min(35vw, 190px))'
                      : 'auto',
                    width: 28,
                    height: 28,
                    borderTop: pos.includes('t')
                      ? '4px solid #0a84ff'
                      : undefined,
                    borderLeft: pos.includes('l')
                      ? '4px solid #0a84ff'
                      : undefined,
                    borderBottom: pos.includes('b')
                      ? '4px solid #0a84ff'
                      : undefined,
                    borderRight: pos.includes('r')
                      ? '4px solid #0a84ff'
                      : undefined,
                    borderRadius: 1,
                  }}
                />
              ))}
            </>
          )}
        </Box>

        {result && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {result}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Manuell scannen (Fallback)
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1 }}
        >
          <TextField
            label="QR‑Token (JWT)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
          />
        </Stack>
      </CardContent>

      <CardActions>
        {!cameraActive ? (
          <Button
            onClick={startCamera}
            variant="contained"
            disabled={loadingCam}
          >
            Kamera starten
          </Button>
        ) : (
          <>
            <Button onClick={stopCamera} variant="outlined" color="warning">
              Kamera stoppen
            </Button>
            <Tooltip
              title={
                torchSupported
                  ? torchOn
                    ? 'Taschenlampe aus'
                    : 'Taschenlampe an'
                  : 'Nicht unterstützt'
              }
            >
              <span>
                <Button
                  onClick={() => setTorch(!torchOn)}
                  variant="outlined"
                  disabled={!torchSupported}
                  startIcon={torchOn ? <FlashOffIcon /> : <FlashOnIcon />}
                >
                  {torchOn ? 'Torch aus' : 'Torch an'}
                </Button>
              </span>
            </Tooltip>
          </>
        )}
        <Button
          onClick={() => trySubmit(token)}
          variant="contained"
          disabled={!token.trim()}
        >
          Buchen
        </Button>
      </CardActions>
    </Card>
  );
}

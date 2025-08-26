// frontend/src/app/scan/page.tsx
'use client';

import { useMutation } from '@apollo/client';
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
import jsQR, { QRCode } from 'jsqr';
import * as React from 'react';
import { HANDLE_SCAN } from '../../graphql/ticket/mutation';

// --- Zusätzliche Typen ohne "any" -------------------------------------------

// ZXing: Typen nur für Generics/Signaturen (keine Runtime-Imports)
import type {
  BarcodeFormat as ZXBarcodeFormat,
  DecodeHintType as ZXDecodeHintType,
} from '@zxing/library';

// Globale Typen für BarcodeDetector (experimentell, aber sauber typisiert)
declare global {
  interface BarcodeDetectorOptions {
    formats?: string[];
  }

  interface DetectedBarcode {
    rawValue: string;
    // (weitere Felder wie boundingBox, format etc. weggelassen – für uns nicht nötig)
  }

  interface BarcodeDetector {
    detect(
      source: CanvasImageSource | ImageBitmapSource,
    ): Promise<DetectedBarcode[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: BarcodeDetectorOptions): BarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
  }

  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }

  // Torch-Fähigkeit an MediaTrackCapabilities ergänzen (per Declaration Merging)
  interface MediaTrackCapabilities {
    torch?: boolean;
  }
}

// ZXing (Video & Image)
type ZXingControls = { stop: () => void };
type ZXingResult = { getText: () => string };
type ZXingReader = {
  decodeFromVideoDevice: (
    deviceId: string | null,
    video: HTMLVideoElement,
    cb: (
      result: ZXingResult | undefined,
      err: unknown,
      controls: ZXingControls,
    ) => void,
  ) => ZXingControls;
  decodeFromImageElement?: (img: HTMLImageElement) => Promise<ZXingResult>;
  decodeFromImageUrl?: (url: string) => Promise<ZXingResult>;
  reset: () => void;
};
type ZXingModule = { BrowserMultiFormatReader: new () => ZXingReader };

// ZXing (Library auf ImageData)
type ZXingLib = typeof import('@zxing/library');

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

// ---------- Haptik ----------
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

// ---------- Beep ----------
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

// ---------- Utils ----------
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function hasMediaDevices(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}
function hasBarcodeDetector(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.BarcodeDetector !== 'undefined'
  );
}

// ---------- Bildverarbeitung für Foto-Fallback ----------
type CanvasPack = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function makeCanvas(w: number, h: number): CanvasPack {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(w));
  canvas.height = Math.max(8, Math.round(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('CanvasContext not available');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function drawImageRotated(
  img: HTMLImageElement,
  w: number,
  h: number,
  rotDeg: 0 | 90 | 180 | 270,
  contrastFilter = false,
): CanvasPack {
  const { canvas, ctx } = makeCanvas(w, h);
  if (contrastFilter) ctx.filter = 'contrast(115%) brightness(105%)';
  ctx.save();
  const r = (rotDeg * Math.PI) / 180;
  // Für 90/270: Canvas tauschen
  if (rotDeg === 90 || rotDeg === 270) {
    canvas.width = h;
    canvas.height = w;
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(r);
  const dw = rotDeg === 90 || rotDeg === 270 ? h : w;
  const dh = rotDeg === 90 || rotDeg === 270 ? w : h;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return { canvas, ctx };
}

function cropCenter(pack: CanvasPack, factor = 0.72): CanvasPack {
  const { canvas } = pack;
  const w = canvas.width;
  const h = canvas.height;
  const side = Math.round(Math.min(w, h) * factor);
  const x = Math.floor((w - side) / 2);
  const y = Math.floor((h - side) / 2);
  const { canvas: c2, ctx: x2 } = makeCanvas(side, side);
  x2.drawImage(canvas, x, y, side, side, 0, 0, side, side);
  return { canvas: c2, ctx: x2 };
}

function cropQuadrants(pack: CanvasPack): CanvasPack[] {
  const { canvas } = pack;
  const w = canvas.width;
  const h = canvas.height;
  const hw = Math.floor(w / 2);
  const hh = Math.floor(h / 2);
  const rects: Array<[number, number, number, number]> = [
    [0, 0, hw, hh],
    [hw, 0, w - hw, hh],
    [0, hh, hw, h - hh],
    [hw, hh, w - hw, h - hh],
  ];
  return rects.map(([x, y, ww, hh2]) => {
    const { canvas: c2, ctx: x2 } = makeCanvas(ww, hh2);
    x2.drawImage(canvas, x, y, ww, hh2, 0, 0, ww, hh2);
    return { canvas: c2, ctx: x2 };
  });
}

// Graustufen-Puffer als Uint8ClampedArray (ZXing erwartet das)
function toGrayLuma(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // ITU-R BT.601
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    out[j] = y;
  }
  return out;
}

// ---------- Foto-Decoding-Pipeline ----------
async function decodeWithBarcodeDetectorImage(
  img: HTMLImageElement,
): Promise<string | null> {
  if (!hasBarcodeDetector() || !window.BarcodeDetector) return null;

  const bmp = await createImageBitmap(img);
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const det = await detector.detect(bmp);
  return det.length > 0 ? det[0].rawValue : null;
}

async function decodeWithZXingImage(
  img: HTMLImageElement,
): Promise<string | null> {
  const mod = (await import('@zxing/browser')) as unknown as ZXingModule;
  const reader = new mod.BrowserMultiFormatReader();

  if (reader.decodeFromImageElement) {
    try {
      const res = await reader.decodeFromImageElement(img);
      const text = res?.getText?.();
      if (text) return text;
    } catch {
      /* try next */
    }
  }

  if (reader.decodeFromImageUrl) {
    try {
      const res = await reader.decodeFromImageUrl(img.src);
      const text = res?.getText?.();
      if (text) return text;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function decodeWithZXingOnImageData(
  pack: CanvasPack,
): Promise<string | null> {
  const lib: ZXingLib = await import('@zxing/library');
  const {
    RGBLuminanceSource,
    HybridBinarizer,
    BinaryBitmap,
    QRCodeReader,
    DecodeHintType,
    BarcodeFormat,
  } = lib;

  const { canvas, ctx } = pack;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGrayLuma(img.data); // Uint8ClampedArray
  const source = new RGBLuminanceSource(gray, canvas.width, canvas.height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  const reader = new QRCodeReader();

  // Typisiert mit statisch importierten Typen
  const hints = new Map<ZXDecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS as ZXDecodeHintType, [
    BarcodeFormat.QR_CODE as ZXBarcodeFormat,
  ]);

  try {
    const res = reader.decode(bitmap, hints);
    const txt = res?.getText?.();
    return txt ?? null;
  } catch {
    return null;
  } finally {
    try {
      reader.reset();
    } catch {
      /* no-op */
    }
  }
}

function decodeWithJsQR(pack: CanvasPack): string | null {
  const { canvas, ctx } = pack;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr: QRCode | null = jsQR(data.data, canvas.width, canvas.height, {
    inversionAttempts: 'attemptBoth',
  });
  return qr?.data ?? null;
}

async function robustPhotoDecode(
  img: HTMLImageElement,
): Promise<string | null> {
  // 1) Direkt versuchen (Browser BD / ZXing Image)
  const bd = await decodeWithBarcodeDetectorImage(img);
  if (bd) return bd;
  const zxi = await decodeWithZXingImage(img);
  if (zxi) return zxi;

  // 2) Mehrstufig (Skalen x Rotationen x Crops) → ZXing (ImageData) → jsQR
  const scales: number[] = [1.5, 2, 1, 0.75, 0.5];
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  for (const s of scales) {
    const w = Math.max(96, Math.round(img.naturalWidth * s));
    const h = Math.max(96, Math.round(img.naturalHeight * s));
    for (const rot of rotations) {
      // ohne Filter
      const base = drawImageRotated(img, w, h, rot, false);
      // Center zuerst
      const center = cropCenter(base, 0.72);
      let text = await decodeWithZXingOnImageData(center);
      if (text) return text;
      text = decodeWithJsQR(center);
      if (text) return text;

      // Quadranten
      for (const quad of cropQuadrants(base)) {
        let t = await decodeWithZXingOnImageData(quad);
        if (t) return t;
        t = decodeWithJsQR(quad);
        if (t) return t;
      }

      // mit leichtem Kontrast
      const baseC = drawImageRotated(img, w, h, rot, true);
      const centerC = cropCenter(baseC, 0.72);
      let t2 = await decodeWithZXingOnImageData(centerC);
      if (t2) return t2;
      t2 = decodeWithJsQR(centerC);
      if (t2) return t2;
    }
  }
  return null;
}

// ---------- Component ----------
export default function ScanPage(): React.JSX.Element {
  const [token, setToken] = React.useState('');
  const [gate, setGate] = React.useState('MAIN');
  const [direction, setDirection] = React.useState<PresenceState>('INSIDE');

  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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

  // Foto-Scan
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Dedupe
  const RECENT_WINDOW_MS = 3000;
  const recentMapRef = React.useRef<Map<number, number>>(new Map());

  const [handleScanMutation] = useMutation<HandleScanPayload>(HANDLE_SCAN);

  const stopCamera = React.useCallback((): void => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (stopZxingRef.current) {
      try {
        stopZxingRef.current();
      } catch {
        /* no-op */
      }
    }
    stopZxingRef.current = null;
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        /* no-op */
      }
      streamRef.current = null;
    }
    setTorchOn(false);
    setCameraActive(false);
    setTorchSupported(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      for (const [k, ts] of [...recentMapRef.current.entries()]) {
        if (now - ts > RECENT_WINDOW_MS) recentMapRef.current.delete(k);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const getVideoTrack = (): MediaStreamTrack | null => {
    const tracks = streamRef.current?.getVideoTracks?.() ?? [];
    return tracks.length ? tracks[0] : null;
  };

  const detectTorchSupport = (): boolean => {
    const track = getVideoTrack();
    try {
      const caps = track?.getCapabilities?.();
      const supported = !!(caps && typeof caps.torch !== 'undefined');
      setTorchSupported(supported);
      return supported;
    } catch {
      setTorchSupported(false);
      return false;
    }
  };

  const setTorch = async (on: boolean): Promise<void> => {
    const track = getVideoTrack();
    if (!track) return;
    try {
      // Torch ist (noch) experimentell → per Intersection-Typ in "advanced"
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

  // Live-Scan: BarcodeDetector
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
      if (!videoRef.current) return;
      try {
        const det = await detector.detect(videoRef.current);
        const text = det.length > 0 ? det[0].rawValue : undefined;
        if (text) {
          await trySubmit(text);
          await new Promise((r) => window.setTimeout(r, 300));
        }
      } catch {
        /* no code in frame */
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    void loop();
    return true;
  };

  // Live-Scan: ZXing
  const startWithZXing = async (video: HTMLVideoElement): Promise<void> => {
    const mod = (await import('@zxing/browser')) as unknown as ZXingModule;
    const reader = new mod.BrowserMultiFormatReader();
    const controls = reader.decodeFromVideoDevice(
      null,
      video,
      async (res, _err, ctrl) => {
        if (res?.getText) await trySubmit(res.getText());
        stopZxingRef.current = () => {
          try {
            ctrl.stop();
          } catch {
            /* no-op */
          }
          try {
            reader.reset();
          } catch {
            /* no-op */
          }
        };
      },
    );
    stopZxingRef.current = () => {
      try {
        controls.stop();
      } catch {
        /* no-op */
      }
      try {
        reader.reset();
      } catch {
        /* no-op */
      }
    };
  };

  // Foto-Fallback
  const onPickImage = async (file: File): Promise<void> => {
    setError(null);
    setResult(null);
    let url: string | null = null;
    try {
      url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error('Bild konnte nicht geladen werden'));
        img.src = url as string;
      });

      const text = (await robustPhotoDecode(img)) ?? null;

      if (text) {
        await trySubmit(text);
        await doHaptic('success');
        await playBeep('success');
      } else {
        setError(
          'Kein QR-Code im Bild gefunden. Bitte näher, frontal und scharf fotografieren.',
        );
        void doHaptic('error');
      }
    } catch (e) {
      const msg =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Bild konnte nicht analysiert werden.';
      setError(msg);
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  // Progressive Kamera-Constraints
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

  const startCamera = async (): Promise<void> => {
    if (cameraActive) return;
    setLoadingCam(true);
    setError(null);
    try {
      if (!hasMediaDevices()) {
        setError(
          'Live-Kamera wird hier nicht unterstützt. Nutze den Foto-Scan.',
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
      if (!ok && videoRef.current) await startWithZXing(videoRef.current);
    } catch (e) {
      const msg =
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Kamera konnte nicht geöffnet werden';
      setError(msg);
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
          QR-Scanner
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Scanne rotierende QR-Tokens. Falls Live-Kamera nicht verfügbar ist,
          nutze den Foto-Scan.
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

          {cameraActive && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={`Gate: ${gate}`} />
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

        {/* Kamera-Viewport */}
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
                  Tippe „Kamera starten“ oder nutze den Foto-Scan.
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
          Manuell / Foto-Scan (Fallback)
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void onPickImage(f);
              e.currentTarget.value = '';
            }}
          />
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
          >
            Foto scannen
          </Button>
        </Stack>
      </CardContent>

      <CardActions>
        {!cameraActive ? (
          <Button
            onClick={() => void startCamera()}
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
                  onClick={() => void setTorch(!torchOn)}
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
      </CardActions>
    </Card>
  );
}

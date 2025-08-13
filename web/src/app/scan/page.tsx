// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/scan/page.tsx
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/context/SessionContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useRouter } from "next/navigation";

// Kamera-Scanner nur Client-seitig laden
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), {
  ssr: false,
});

type ScanLogEntry = {
  ticketId: string;
  eventId: string;
  direction: string;
  verdict: string;
  gate?: string;
  createdAt: string;
};

type FrameStatus = "idle" | "success" | "error" | "scanning";

export default function ScanPage() {
  const { isAuthenticated, roles, loading } = useSession();
  const router = useRouter();

  // --- UI/State ---
  const [scanResult, setScanResult] = React.useState<string | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [statusType, setStatusType] = React.useState<
    "success" | "error" | "warning" | "info"
  >("info");
  const [fetching, setFetching] = React.useState(false);
  const [logs, setLogs] = React.useState<ScanLogEntry[]>([]);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  // Rahmenfarbe/Status
  const [frameStatus, setFrameStatus] = React.useState<FrameStatus>("idle");

  // Fehler-Popup
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false);
  const openErrorDialog = (message: string) => {
    setStatusMsg(message);
    setStatusType("error");
    setErrorDialogOpen(true);
  };

  // --- Access Control ---
  const hasAccess = roles.includes("security") || roles.includes("admin");

  // --- Scan Throttle/Debounce ---
  const lastScanAtRef = React.useRef<number>(0);
  const processedTokensRef = React.useRef<Set<string>>(new Set());
  const COOLDOWN_MS = 1500;

  const now = () => Date.now();

  const handleScan = async (data: string) => {
    if (!data) return;

    // Debounce: zu schneller Doppel-Scan verhindern
    const last = lastScanAtRef.current;
    if (now() - last < COOLDOWN_MS) return;
    lastScanAtRef.current = now();

    // Duplikate im selben Session-Lauf vermeiden
    if (processedTokensRef.current.has(data)) return;
    processedTokensRef.current.add(data);

    setScanResult(data);
    await validateQr(data);
  };

  const handleError = (err: any) => {
    // NotFoundException tritt bei Frames ohne Code ständig auf: NICHT anzeigen
    if (err?.name === "NotFoundException") return;

    const message =
      err?.message ||
      err?.name ||
      "Unbekannter Kamera-/Scan-Fehler. Bitte erneut versuchen.";

    // Kameraberechtigungen gesondert behandeln
    if (
      message.toLowerCase().includes("notallowederror") ||
      message.toLowerCase().includes("permission") ||
      message.toLowerCase().includes("denied")
    ) {
      setCameraError(
        "Kein Kamerazugriff. Bitte Kameraberechtigung erlauben und Seite neu laden."
      );
      setFrameStatus("error");
      openErrorDialog(
        "Kamera-Berechtigung fehlt. Erlaube den Zugriff in den Browser-/Systemeinstellungen."
      );
    } else {
      setFrameStatus("error");
      openErrorDialog("Kamera-/Scan-Fehler: " + message);
    }
  };

  const validateQr = async (qrToken: string) => {
    setFetching(true);
    setFrameStatus("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Cookies (Session) mitsenden
        body: JSON.stringify({ qrToken, gate: "main" }),
      });

      const data = await res.json();

      if (!res.ok) {
        // ❌ Fehler → roter Rand + Popup mit Server-Nachricht
        setFrameStatus("error");
        const msg =
          data?.error ||
          data?.message ||
          (res.status === 401
            ? "Nicht eingeloggt oder QR-Code ungültig."
            : "Fehler bei der Prüfung.");
        openErrorDialog(msg);
      } else {
        // ✅ Erfolg → grüner Rand, Status anzeige
        setFrameStatus("success");
        setStatusType(data.verdict === "ALLOWED" ? "success" : "success");
        setStatusMsg(data.message || "Zugang erlaubt");

        // Optional: Haptik (mobil)
        if (typeof window !== "undefined" && "vibrate" in window.navigator) {
          try {
            window.navigator.vibrate?.(50);
          } catch {}
        }
      }
    } catch (err: any) {
      setFrameStatus("error");
      openErrorDialog(err?.message || "Netzwerkfehler bei der Prüfung");
    } finally {
      setFetching(false);
    }
  };

  // WebSocket für Live-Logs
  React.useEffect(() => {
    if (!isAuthenticated || !hasAccess) return;
    const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(url);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "scan-log") {
            setLogs((prev) => [msg.data, ...prev].slice(0, 10));
          }
        } catch (err) {
          console.error("WS Nachricht Fehler:", err);
        }
      };
    } catch (e) {
      console.error("WebSocket Fehler:", e);
    }

    return () => {
      try {
        ws?.close();
      } catch {}
    };
  }, [isAuthenticated, hasAccess]);

  // Login-/Rechte-Check
  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) {
    router.push(`/login?next=${encodeURIComponent("/scan")}`);
    return null;
  }
  if (!hasAccess) {
    return (
      <Box textAlign="center" mt={4}>
        <Alert severity="error">
          Keine Berechtigung – nur Security/Admin können scannen.
        </Alert>
      </Box>
    );
  }

  // Rahmenfarbe abhängig vom Scanstatus
  const frameBorderColor =
    frameStatus === "success"
      ? "rgba(46, 204, 113, 0.95)" // grün
      : frameStatus === "error"
        ? "rgba(231, 76, 60, 0.95)" // rot
        : "rgba(255,255,255,0.7)"; // neutral

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Typography variant="h6">Security-Scanner</Typography>
          <Chip
            size="small"
            label={cameraReady ? "Kamera bereit" : "Kamera initialisiert..."}
            color={cameraReady ? "success" : "default"}
            variant="outlined"
          />
          {frameStatus === "success" && (
            <Chip size="small" label="Erfolgreich" color="success" />
          )}
          {frameStatus === "error" && (
            <Chip size="small" label="Fehler" color="error" />
          )}
        </Stack>

        <Box
          sx={{
            mt: 2,
            display: "grid",
            placeItems: "center",
            position: "relative",
            width: "100%",
            maxWidth: 520,
            mx: "auto",
            aspectRatio: "3 / 4",
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: (t) => t.shadows[3],
            // dynamischer Rand:
            outline: `4px solid ${frameBorderColor}`,
            outlineOffset: 0,
            transition: "outline-color 160ms ease, box-shadow 160ms ease",
          }}
        >
          <BarcodeScanner
            onUpdate={(err, result) => {
              if (result) handleScan(result.getText());
              if (err) handleError(err);
            }}
            // Höhere Auflösung & Rear-Cam bevorzugen
            constraints={{
              audio: false,
              video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
              } as MediaTrackConstraints,
            }}
            onLoad={() => setCameraReady(true)}
            style={{ width: "100%", height: "100%" }}
          />

          {/* Zielhilfe/Overlay (Farbe wechselt mit Status) */}
          <Box
            sx={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              border: `2px dashed ${frameBorderColor}`,
              borderRadius: 12,
              boxShadow:
                frameStatus === "success"
                  ? "inset 0 0 0 9999px rgba(46, 204, 113, 0.12)"
                  : frameStatus === "error"
                    ? "inset 0 0 0 9999px rgba(231, 76, 60, 0.12)"
                    : "inset 0 0 0 9999px rgba(0,0,0,0.20)",
              transition:
                "border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease",
            }}
          />
        </Box>

        {/* Hinweise */}
        <Typography variant="body2" color="text.secondary" mt={1}>
          Tipp: QR-Code mittig und möglichst formatfüllend halten. Blendungen
          vermeiden, ruhig halten, gute Beleuchtung.
        </Typography>

        {/* Live-Status */}
        {fetching && (
          <Box textAlign="center" mt={2}>
            <CircularProgress />
          </Box>
        )}

        {cameraError && (
          <Alert severity="error" sx={{ mt: 2, fontWeight: 600 }}>
            {cameraError}
          </Alert>
        )}

        {statusMsg && statusType !== "error" && (
          <Alert
            severity={statusType}
            sx={{ mt: 2, fontWeight: 600, fontSize: "1rem" }}
          >
            {statusMsg}
          </Alert>
        )}

        {/* Letzter Token (Debug/Transparenz für Security) */}
        {scanResult && (
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 2, wordBreak: "break-all" }}
          >
            Gescannter Token: {scanResult}
          </Typography>
        )}

        {/* Letzte Scans (WebSocket) */}
        {logs.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Letzte Scans
            </Typography>
            <Stack spacing={0.5}>
              {logs.map((log, idx) => (
                <Typography key={idx} variant="body2">
                  <strong>{log.ticketId}</strong> → {log.direction} @{" "}
                  {log.gate ?? "—"} [{log.verdict}] •{" "}
                  <span style={{ opacity: 0.7 }}>{log.createdAt}</span>
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        {/* Reset-Button */}
        <Stack direction="row" spacing={1} mt={2}>
          <Button
            variant="outlined"
            onClick={() => {
              setScanResult(null);
              setStatusMsg(null);
              setStatusType("info");
              setFrameStatus("idle");
              processedTokensRef.current.clear();
            }}
          >
            Zurücksetzen
          </Button>
        </Stack>

        {/* ❗ Fehler-Popup mit Server-Meldung */}
        <Dialog
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Scan fehlgeschlagen</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {statusMsg ||
                "Es ist ein Fehler beim Prüfen des QR-Codes aufgetreten."}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrorDialogOpen(false)}>Schließen</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

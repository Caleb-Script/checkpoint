// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/my-qr/page.tsx
"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  Stack,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";

type QrResponse = {
  ticketId: string;
  eventId: string;
  direction: "IN" | "OUT";
  qr: string; // data URL
  token: string; // JWT im QR
  expiresInSeconds: number;
};

export default function MyQrPage() {
  const { isAuthenticated } = useSession();
  const router = useRouter();

  const [qrData, setQrData] = React.useState<QrResponse | null>(null);
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState<number | null>(null);

  const fetchMyQr = React.useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      // Cookie-basierte Auth: KEIN Authorization-Header notwendig
      const res = await fetch("/api/my-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ direction, deviceId: "guest-web" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Laden des QR");

      setQrData(data);
      setCountdown(data.expiresInSeconds);
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, direction]);

  // Countdown- und Auto-Refresh-Logik
  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      fetchMyQr();
      return;
    }
    const t = setTimeout(
      () => setCountdown((c) => (c !== null ? c - 1 : null)),
      1000
    );
    return () => clearTimeout(t);
  }, [countdown, fetchMyQr]);

  // Beim Start & wenn Richtung geändert wurde
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchMyQr();
    }
  }, [isAuthenticated, fetchMyQr, direction]);

  if (!isAuthenticated) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6">Bitte zuerst einloggen</Typography>
        <Button
          variant="contained"
          onClick={() =>
            router.push(`/login?next=${encodeURIComponent("/my-qr")}`)
          }
        >
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            Mein Eintritts-QR
          </Typography>

          <ToggleButtonGroup
            size="small"
            value={direction}
            exclusive
            onChange={(_, v) => v && setDirection(v)}
          >
            <ToggleButton value="IN">Einlass</ToggleButton>
            <ToggleButton value="OUT">Auslass</ToggleButton>
          </ToggleButtonGroup>

          {error && <Alert severity="error">{error}</Alert>}

          {loading && <CircularProgress />}

          {qrData && !loading && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.qr}
                alt="Mein Ticket QR"
                style={{
                  width: 280,
                  height: 280,
                  background: "#fff",
                  padding: 8,
                  borderRadius: 16,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Läuft ab in {countdown}s
              </Typography>
              <Button
                startIcon={<RefreshRoundedIcon />}
                onClick={fetchMyQr}
                variant="outlined"
                size="small"
              >
                Neu laden
              </Button>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

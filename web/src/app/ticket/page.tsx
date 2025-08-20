// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/ticket/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Chip,
  Alert,
  Divider,
  Button,
  LinearProgress,
} from "@mui/material";

type InfoResp = {
  ok: boolean;
  ticket?: {
    id: string;
    state: "INSIDE" | "OUTSIDE";
    seat: {
      section?: string | null;
      row?: string | null;
      number?: string | null;
    } | null;
  };
  event?: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    rotateSeconds: number;
  };
  guest?: { name: string };
  media?: { pngUrl: string; pdfUrl: string };
  token?: { value: string; ttl: number; exp: number };
  error?: string;
};

export default function TicketPage() {
  const params = useSearchParams();
  const claim = params.get("claim") || "";
  const [info, setInfo] = React.useState<InfoResp | null>(null);
  const [err, setErr] = React.useState<string>("");
  const [secondsLeft, setSecondsLeft] = React.useState<number>(0);
  const [pngUrl, setPngUrl] = React.useState<string>("");
  const [pdfUrl, setPdfUrl] = React.useState<string>("");

  // Initial laden
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(
          `/api/public/tickets/info?token=${encodeURIComponent(claim)}`,
          { cache: "no-store" },
        );
        const j: InfoResp = await r.json();
        if (!active) return;
        if (!r.ok || !j.ok) throw new Error(j.error || "Ticket nicht geladen");
        setInfo(j);
        setPngUrl(cacheBust(j.media!.pngUrl));
        setPdfUrl(j.media!.pdfUrl);
        setSecondsLeft(Math.max(0, j.token!.ttl || j.event!.rotateSeconds));
      } catch (e: any) {
        if (active) setErr(e.message || "Fehler");
      }
    })();
    return () => {
      active = false;
    };
  }, [claim]);

  // Countdown + Rotation
  React.useEffect(() => {
    if (!info?.ok) return;
    let timer: any;
    const tick = () => {
      setSecondsLeft((s) => {
        const ns = s - 1;
        if (ns <= 0) {
          // Rotiere Token & QR
          rotate();
          return info?.event?.rotateSeconds ?? 60;
        }
        return ns;
      });
    };
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.ok]);

  async function rotate() {
    try {
      const r = await fetch("/api/public/tickets/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: info?.token?.value || claim }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Rotation fehlgeschlagen");
      setPngUrl(cacheBust(j.media.pngUrl));
      setPdfUrl(j.media.pdfUrl);
      setSecondsLeft(j.token.ttl);
      setInfo((old) => (old ? { ...old, token: j.token } : old));
    } catch (e: any) {
      // Wenn Rotation fehlschlägt: Fehlermeldung, aber Seite bleibt nutzbar (Nächster Versuch in 60s)
      setErr(e.message || "Rotation fehlgeschlagen");
    }
  }

  function cacheBust(url: string) {
    const u = new URL(
      url,
      typeof window === "undefined" ? "http://x" : window.location.origin,
    );
    u.searchParams.set("v", Date.now().toString());
    return u.pathname + "?" + u.searchParams.toString();
  }

  if (!claim) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720, mx: "auto" }}>
        <Alert severity="error">Kein Ticket-Token übergeben.</Alert>
      </Box>
    );
  }

  if (err && !info?.ok) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720, mx: "auto" }}>
        <Alert severity="error">{err}</Alert>
      </Box>
    );
  }

  if (!info?.ok) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Lade Ticket…
        </Typography>
      </Box>
    );
  }

  const seatText = info.ticket?.seat
    ? [
        info.ticket.seat.section ? `Sektion ${info.ticket.seat.section}` : null,
        info.ticket.seat.row ? `Reihe ${info.ticket.seat.row}` : null,
        info.ticket.seat.number ? `Platz ${info.ticket.seat.number}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Kein Sitz zugewiesen";

  const presence =
    info.ticket?.state === "INSIDE"
      ? { label: "DRINNEN", color: "success" as const }
      : { label: "DRAUßEN", color: "default" as const };

  const secondsTotal = info.event?.rotateSeconds ?? 60;
  const progress = Math.max(
    0,
    Math.min(100, ((secondsTotal - secondsLeft) / secondsTotal) * 100),
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: "auto" }}>
      <Card>
        <CardHeader
          title={`Ticket für „${info.event!.name}“`}
          subheader={`${new Date(info.event!.startsAt).toLocaleString("de-DE")} – ${new Date(info.event!.endsAt).toLocaleString("de-DE")}`}
        />
        <CardContent>
          {/* Kopfbereich */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2, gap: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {info.guest?.name}
            </Typography>
            <Chip label={presence.label} color={presence.color} />
          </Stack>

          {/* Sitz */}
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Sitz:</strong> {seatText}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* QR Anzeige */}
          <Stack alignItems="center" sx={{ mb: 1 }}>
            <img
              src={pngUrl}
              alt="QR-Code"
              style={{
                width: "min(80vw, 360px)",
                height: "auto",
                imageRendering: "pixelated",
                borderRadius: 16,
                boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
              }}
            />
          </Stack>

          {/* Countdown / Fortschritt */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center" }}
          >
            Nächster QR in {secondsLeft}s
          </Typography>
          <Box sx={{ mt: 1, mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Button
              href={pngUrl}
              target="_blank"
              rel="noopener"
              variant="outlined"
              fullWidth
            >
              QR als PNG öffnen
            </Button>
            <Button
              href={pdfUrl}
              target="_blank"
              rel="noopener"
              variant="contained"
              fullWidth
            >
              PDF herunterladen
            </Button>
          </Stack>

          {err && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {err}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography variant="caption" color="text.secondary">
            Dieses Ticket rotiert alle {secondsTotal}s. Teile den Link nicht
            weiter.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import * as React from 'react';

type MyQrResponse = {
  dataUrl?: string;
  seat?: {
    section?: string | null;
    row?: string | null;
    number?: string | null;
    note?: string | null;
  } | null;
  rotateSeconds?: number;
  ticketId?: string;
  state?: 'INSIDE' | 'OUTSIDE';
};

export default function MyQrPage() {
  const [info, setInfo] = React.useState<MyQrResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ts, setTs] = React.useState<number>(Date.now());

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/my-qr', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setInfo(data as MyQrResponse);
    } catch (e: any) {
      setError(e.message);
    }
  };

  React.useEffect(() => {
    load();
  }, []);
  React.useEffect(() => {
    if (!info?.rotateSeconds) return;
    const id = setInterval(() => {
      setTs(Date.now());
      load();
    }, info.rotateSeconds * 1000);
    return () => clearInterval(id);
  }, [info?.rotateSeconds]);

  const seatStr = info?.seat
    ? [info.seat.section, info.seat.row, info.seat.number]
        .filter(Boolean)
        .join(' • ')
    : '—';

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Mein Ticket
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Zeige diesen QR am Eingang. Der Code rotiert automatisch.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {info?.dataUrl ? (
          <Stack spacing={1} alignItems="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.dataUrl}
              alt="Ticket QR"
              width={240}
              height={240}
              style={{ borderRadius: 12 }}
            />
            <Typography variant="body2">
              <b>Platz:</b> {seatStr}
            </Typography>
            <Typography variant="body2">
              <b>Status:</b> {info.state ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Aktualisiert: {new Date(ts).toLocaleTimeString()}
            </Typography>
          </Stack>
        ) : (
          <Typography>
            Kein Ticket gefunden. Bitte nach RSVP und Freigabe erneut prüfen.
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button onClick={load} variant="outlined">
            Aktualisieren
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

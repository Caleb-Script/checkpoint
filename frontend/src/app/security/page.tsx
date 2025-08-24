'use client';

import {
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import * as React from 'react';

type ScanLog = {
  id: string;
  createdAt: string;
  ticketId: string;
  direction: 'INSIDE' | 'OUTSIDE';
  gate?: string | null;
  verdict: string;
};

export default function SecurityDashboardPage() {
  const [inside, setInside] = React.useState<number>(0);
  const [outside, setOutside] = React.useState<number>(0);
  const [logs, setLogs] = React.useState<ScanLog[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/security/logs');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Fehler');
      setLogs(data?.logs ?? []);
      setInside(data?.inside ?? 0);
      setOutside(data?.outside ?? 0);
    } catch (e: any) {
      setError(e.message);
    }
  };

  React.useEffect(() => {
    load();
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/api/ws-status';
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'scan-log') load();
        } catch {}
      };
    } catch {}
    return () => {
      ws?.close();
    };
  }, []);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Security‑Dashboard
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 2 }}
          useFlexGap
          flexWrap="wrap"
        >
          <Chip label={`Drinnen: ${inside}`} color="success" />
          <Chip label={`Draußen: ${outside}`} />
        </Stack>

        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {logs.map((l) => (
            <React.Fragment key={l.id}>
              <ListItem>
                <ListItemText
                  primary={`${l.direction} • Ticket ${l.ticketId.slice(0, 6)}… • ${l.gate ?? '—'}`}
                  secondary={`${new Date(l.createdAt).toLocaleTimeString()} • ${l.verdict}`}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
          {logs.length === 0 && (
            <ListItem>
              <ListItemText primary="Noch keine Scans" />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );
}

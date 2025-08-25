// /web/src/app/security/page.tsx
'use client';

import { useQuery } from '@apollo/client';
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

// ⚠️ Import-Pfad an dein Projekt anpassen (hier: singular "ticket")
import { GET_TICKETS } from '@/graphql/ticket/query';

type TicketRow = {
  id: string;
  eventId: string;
  invitationId: string;
  seatId?: string | null;
  currentState: 'INSIDE' | 'OUTSIDE';
};

type ScanLog = {
  id: string;
  createdAt: string;
  ticketId: string;
  direction: 'INSIDE' | 'OUTSIDE';
  gate?: string | null;
  verdict: string;
};

export default function SecurityDashboardPage() {
  // Live-Logs (nur WebSocket; kein REST)
  const [logs, setLogs] = React.useState<ScanLog[]>([]);
  const [wsError, setWsError] = React.useState<string | null>(null);

  // Tickets laden → Zähler INSIDE/OUTSIDE
  const { data, loading, error, refetch } = useQuery<{
    getTickets: TicketRow[];
  }>(GET_TICKETS, { fetchPolicy: 'cache-and-network' });

  const tickets = data?.getTickets ?? [];
  const inside = React.useMemo(
    () => tickets.filter((t) => t.currentState === 'INSIDE').length,
    [tickets],
  );
  const outside = React.useMemo(
    () => tickets.filter((t) => t.currentState === 'OUTSIDE').length,
    [tickets],
  );

  // WebSocket nur für Live-Feed + sofortiges Refetch der Zähler
  React.useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/api/ws-status';
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          // Erwartetes Schema: { type: 'scan-log', log: { ... } }
          if (msg?.type === 'scan-log' && msg?.log) {
            setLogs((prev) => {
              const next = [msg.log as ScanLog, ...prev];
              // Liste nicht ins Unendliche wachsen lassen
              return next.slice(0, 200);
            });
            // Tickets neu laden, damit die INSIDE/OUTSIDE-Zähler direkt stimmen
            refetch?.();
          }
        } catch {
          // ignore parse errors
        }
      };
      ws.onerror = () =>
        setWsError('WebSocket-Fehler – Live-Feed ggf. unterbrochen.');
    } catch (e: any) {
      setWsError(e?.message ?? 'WebSocket konnte nicht geöffnet werden.');
    }
    return () => ws?.close();
  }, [refetch]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Security-Dashboard
        </Typography>

        {wsError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {wsError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 2 }}
          useFlexGap
          flexWrap="wrap"
        >
          <Chip
            label={`Drinnen: ${inside}${loading ? ' …' : ''}`}
            color="success"
          />
          <Chip label={`Draußen: ${outside}${loading ? ' …' : ''}`} />
          <Chip label={`Live-Logs: ${logs.length}`} variant="outlined" />
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
              <ListItemText
                primary="Noch keine Live-Scans"
                secondary="Sobald ein Scan erfolgt, erscheinen die Einträge hier."
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );
}

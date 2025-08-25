// /web/src/app/security/page.tsx
'use client';

import { GET_TICKETS } from '@/graphql/ticket/query';
import { useQuery } from '@apollo/client';
import {
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

function wsUrl(path = '/api/ws-status') {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${path}`;
}
function sseUrl(path = '/api/sse-status') {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol; // http/https
  return `${proto}//${window.location.host}${path}`;
}

export default function SecurityDashboardPage() {
  // Tickets → Zähler
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

  // Live-Logs
  const [logs, setLogs] = React.useState<ScanLog[]>([]);
  const pushLog = React.useCallback((l: ScanLog) => {
    setLogs((prev) => [l, ...prev].slice(0, 200));
  }, []);

  // Verbindungsstatus
  const [liveError, setLiveError] = React.useState<string | null>(null);
  const [usingSse, setUsingSse] = React.useState(false);

  // Refs
  const wsRef = React.useRef<WebSocket | null>(null);
  const esRef = React.useRef<EventSource | null>(null);
  const retryRef = React.useRef(0);
  const pingTimerRef = React.useRef<number | null>(null);

  const clearPingTimer = () => {
    if (pingTimerRef.current) {
      window.clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  };

  const fallbackToSse = React.useCallback(() => {
    // WS schließen
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;

    // SSE verbinden (einfach & stabil)
    try {
      const url = sseUrl('/api/sse-status');
      const es = new EventSource(url, { withCredentials: false });
      esRef.current = es;
      setUsingSse(true);
      setLiveError(null);

      es.addEventListener('message', (e) => {
        // default channel
        try {
          const msg = JSON.parse(e.data || '{}');
          if (msg?.type === 'scan-log' && msg?.log) {
            pushLog(msg.log as ScanLog);
            refetch?.();
          }
        } catch {}
      });
      es.addEventListener('ping', () => {
        /* heartbeat ok */
      });
      es.addEventListener('hello', () => {
        /* welcome */
      });

      es.onerror = () => {
        setLiveError('SSE-Verbindung unterbrochen – wird neu aufgebaut …');
        // Auto-Reconnect macht EventSource selbst (aber Browser-spezifisch)
      };
    } catch (e: any) {
      setLiveError(e?.message ?? 'SSE konnte nicht gestartet werden.');
    }
  }, [pushLog, refetch]);

  const connectWs = React.useCallback(() => {
    setUsingSse(false);
    // externer Override möglich
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    const url = envUrl?.startsWith('ws') ? envUrl : wsUrl('/api/ws-status');

    let opened = false;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setLiveError(null);

      ws.onopen = () => {
        opened = true;
        retryRef.current = 0;
        // Heartbeat: wenn in 40s keine Nachricht, neu verbinden
        clearPingTimer();
        pingTimerRef.current = window.setTimeout(() => {
          try {
            ws.close();
          } catch {}
        }, 40000);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data || '{}'));
          if (msg?.type === 'ping') {
            // refresh heartbeat timer
            clearPingTimer();
            pingTimerRef.current = window.setTimeout(() => {
              try {
                ws.close();
              } catch {}
            }, 40000);
            return;
          }
          if (msg?.type === 'scan-log' && msg?.log) {
            pushLog(msg.log as ScanLog);
            refetch?.();
          }
        } catch {}
      };

      ws.onerror = () => {
        setLiveError('WebSocket-Fehler – versuche Fallback …');
      };

      ws.onclose = () => {
        clearPingTimer();
        // Wenn nie „open“ erreicht wurde oder sofort close: Fallback auf SSE
        if (!opened || retryRef.current > 3) {
          fallbackToSse();
          return;
        }
        // Reconnect mit Backoff
        const retry = Math.min(30000, 500 * 2 ** retryRef.current++);
        setTimeout(connectWs, retry);
      };
    } catch (e: any) {
      setLiveError(
        e?.message ?? 'WebSocket konnte nicht initialisiert werden.',
      );
      fallbackToSse();
    }
  }, [fallbackToSse, pushLog, refetch]);

  React.useEffect(() => {
    connectWs();
    return () => {
      clearPingTimer();
      try {
        wsRef.current?.close();
      } catch {}
      try {
        esRef.current?.close();
      } catch {}
      wsRef.current = null;
      esRef.current = null;
    };
  }, [connectWs]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Security-Dashboard
        </Typography>

        {/* {(liveError || error) && (
          <Alert severity={error ? 'error' : 'warning'} sx={{ mb: 2 }}>
            {error ? error.message : liveError}
          </Alert>
        )} */}

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
          <Chip
            label={usingSse ? 'Live: SSE' : 'Live: WS'}
            variant="outlined"
          />
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
              <ListItemText primary="Noch keine Live-Scans" />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );
}

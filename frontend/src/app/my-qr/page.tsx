// /web/src/app/my-qr/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import * as React from 'react';

// ⚠️ Import-Pfade bitte an **dein** Projekt anpassen.
// Du verwendest bereits "ticket" (Singular) – daran halte ich mich hier:
import { ROTATE_TOKEN } from '@/graphql/ticket/mutation';
import { GET_TICKET_BY_ID } from '@/graphql/ticket/query';
import { Ticket } from '../../types/ticket/ticket.type';

function secondsLeft(expireAt: number) {
  const diff = Math.floor((expireAt - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

async function computeDeviceHash(): Promise<string> {
  // stabil pro Gerät/Browser – lokal gesalzen
  const saltKey = 'cp_device_salt';
  let salt = localStorage.getItem(saltKey);
  if (!salt) {
    salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(saltKey, salt);
  }
  const enc = new TextEncoder();
  const data = enc.encode(navigator.userAgent + '|' + salt);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 32);
}

export default function MyQRPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ticketId kommt aus dem Keycloak-Token (Array -> wir nehmen das erste)
  const ticketId = (user?.ticketId?.[0] ?? user?.ticketId?.[0]) as
    | string
    | undefined;

  const { data, loading, error, refetch } = useQuery<{
    getTicketById: Ticket;
  }>(GET_TICKET_BY_ID, { variables: { id: ticketId }, skip: !ticketId });

  const [rotate] = useMutation(ROTATE_TOKEN);

  const [tab, setTab] = React.useState(0);
  const [token, setToken] = React.useState('');
  const [ttl, setTtl] = React.useState(0);
  const [expireAt, setExpireAt] = React.useState(0);
  const [err, setErr] = React.useState<string | null>(null);

  const ticket = data?.getTicketById;

  async function refreshToken() {
    if (!ticket?.id) return;
    setErr(null);
    try {
      const deviceHash = await computeDeviceHash();
      const res = await rotate({
        variables: { ticketId: ticket.id, deviceHash, ttlSeconds: 60 },
      });
      const tok = res.data?.rotateToken?.token as string | undefined;
      const ttlSec = res.data?.rotateToken?.ttlSeconds as number | undefined;
      if (!tok || !ttlSec) {
        setErr('Kein Token erhalten.');
        return;
      }
      setToken(tok);
      setTtl(ttlSec);
      setExpireAt(Date.now() + ttlSec * 1000);
    } catch (e: any) {
      setErr(e?.message || 'Token konnte nicht erzeugt werden.');
    }
  }

  // Countdown + leiser Auto-Refresh kurz vor Ablauf
  React.useEffect(() => {
    if (!expireAt) return;
    const id = setInterval(() => {
      const left = secondsLeft(expireAt);
      setTtl(left);
      if (left <= 5) {
        // automatisch erneuern (failures ignorieren)
        refreshToken().catch(() => {});
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expireAt]);

  if (authLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Mein QR
      </Typography>

      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Du bist nicht eingeloggt. Bitte anmelden, um dein Ticket zu sehen.
        </Alert>
      )}

      {!ticketId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          In deinem Token ist kein <code>ticketId</code> hinterlegt.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Ticket"
          subheader={ticket ? `Ticket-ID: ${ticket.id}` : undefined}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => refetch()}
                disabled={!ticketId || loading}
              >
                Aktualisieren
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={refreshToken}
                disabled={!ticketId || loading}
              >
                QR-Token generieren/erneuern
              </Button>
            </Stack>
          }
        />
        <CardContent>
          {loading && <Typography>Wird geladen…</Typography>}
          {!loading && !ticket && (
            <Alert severity="info">Kein Ticket gefunden.</Alert>
          )}

          {ticket && (
            <>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="QR-Code" />
                <Tab label="Details" />
              </Tabs>

              {/* Tab 0: QR */}
              {tab === 0 && (
                <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
                  {token ? (
                    <>
                      <QRCodeCanvas value={token} size={260} includeMargin />
                      <Typography variant="body2">
                        Token läuft ab in <strong>{ttl}s</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gerätegebunden – funktioniert nur auf diesem Gerät.
                      </Typography>
                    </>
                  ) : (
                    <Alert severity="info" sx={{ width: '100%' }}>
                      Noch kein Token generiert. Klicke auf „QR-Token
                      generieren/erneuern“.
                    </Alert>
                  )}
                  {err && (
                    <Alert severity="error" sx={{ width: '100%' }}>
                      {err}
                    </Alert>
                  )}
                </Stack>
              )}

              {/* Tab 1: Details */}
              {tab === 1 && (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell width={160}>Ticket</TableCell>
                        <TableCell>
                          <code>{ticket.id}</code>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Event</TableCell>
                        <TableCell>
                          <code>{ticket.eventId}</code>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Invitation</TableCell>
                        <TableCell>
                          <code>{ticket.invitationId}</code>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sitz</TableCell>
                        <TableCell>
                          {ticket.seatId ?? 'Noch nicht zugewiesen'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ticket.currentState}
                            color={
                              ticket.currentState === 'INSIDE'
                                ? 'success'
                                : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                      {ticket.deviceBoundKey && (
                        <TableRow>
                          <TableCell>Device Key</TableCell>
                          <TableCell>
                            <code>{ticket.deviceBoundKey}</code>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

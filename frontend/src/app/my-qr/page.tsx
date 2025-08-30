'use client';

import { useAuth } from '@/context/AuthContext';
import { ApolloError, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

// Zentrale GraphQL-Definitionen
import { CREATE_TOKEN } from '@/graphql/ticket/mutation';
import { GET_TICKET_BY_ID } from '@/graphql/ticket/query';
import type { Ticket } from '@/types/ticket/ticket.type';

// ZENTRALE Device-Utility (statt lokaler Implementierung)
import { getDeviceHash } from '../../lib/device/device-hash';

type CreateTokenPayload = {
  createToken: {
    token: string;
    exp: number; // epoch seconds
    jti: string;
  };
};

function getFirstTicketId(input: unknown): string | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) return input[0];
  if (typeof input === 'string') return input;
  return undefined;
}

function secondsLeftFromEpoch(expEpochSeconds: number): number {
  const ms = expEpochSeconds * 1000 - Date.now();
  const s = Math.floor(ms / 1000);
  return s > 0 ? s : 0;
}

function formatExp(expEpochSeconds: number): string {
  try {
    return new Date(expEpochSeconds * 1000).toLocaleString();
  } catch {
    return String(expEpochSeconds);
  }
}

function extractGraphQLErrorMessage(err: unknown): string {
  const ap = err as ApolloError;
  const msg =
    ap?.graphQLErrors?.[0]?.message ||
    (typeof ap?.message === 'string' ? ap.message : null);
  return msg || 'Unbekannter Fehler bei der Token-Erzeugung.';
}

export default function MyQRPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ticketId robust aus Token (string oder string[])
  const ticketId = getFirstTicketId(user?.ticketId);

  const { data, loading, error, refetch } = useQuery<{ getTicketById: Ticket }>(
    GET_TICKET_BY_ID,
    {
      variables: { id: ticketId },
      skip: !ticketId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [createToken] = useMutation<CreateTokenPayload>(CREATE_TOKEN);

  const [tab, setTab] = React.useState(0);
  const [token, setToken] = React.useState<string>('');
  const [expEpoch, setExpEpoch] = React.useState<number>(0);
  const [jti, setJti] = React.useState<string>('');
  const [secondsLeft, setSecondsLeft] = React.useState<number>(0);

  // Inline-Fehler unter dem QR
  const [inlineErr, setInlineErr] = React.useState<string | null>(null);

  // Pop-up für „Untrusted device …“
  const [deviceDialogOpen, setDeviceDialogOpen] = React.useState(false);
  const [deviceDialogMsg, setDeviceDialogMsg] = React.useState<string>('');

  const ticket = data?.getTicketById;

  const refreshToken = React.useCallback(async () => {
    if (!ticket?.id) return;
    setInlineErr(null);
    try {
      const deviceHash = await getDeviceHash(); // zentrale Utility
      const res = await createToken({
        variables: { ticketId: ticket.id, deviceHash },
      });

      const payload = res.data?.createToken;
      if (res.errors && res.errors[0]) {
        setDeviceDialogMsg(
          'Dieses Gerät ist nicht freigegeben. Admin-Freigabe erforderlich.',
        );
        setDeviceDialogOpen(true);
      }
      if (!payload?.token || !payload?.exp || !payload?.jti) {
        setInlineErr('Kein gültiges Token erhalten.');
        return;
      }

      setToken(payload.token);
      setExpEpoch(payload.exp);
      setJti(payload.jti);
      setSecondsLeft(secondsLeftFromEpoch(payload.exp));
    } catch (e: unknown) {
      const message = extractGraphQLErrorMessage(e);

      // spezieller Geräte-Fehler → Dialog
      if (message.toLowerCase().includes('untrusted device')) {
        setDeviceDialogMsg(
          'Dieses Gerät ist nicht freigegeben. Admin-Freigabe erforderlich.',
        );
        setDeviceDialogOpen(true);
      } else {
        setInlineErr(message);
      }
    }
  }, [createToken, ticket?.id]);

  // Countdown & sanfter Auto-Refresh kurz vor Ablauf
  React.useEffect(() => {
    if (!expEpoch) return;
    const id = window.setInterval(() => {
      const left = secondsLeftFromEpoch(expEpoch);
      setSecondsLeft(left);
      if (left > 0 && left <= 5) {
        void refreshToken();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [expEpoch, refreshToken]);

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
                <Stack alignItems="center" spacing={1.25} sx={{ py: 1 }}>
                  {token ? (
                    <>
                      <QRCodeCanvas value={token} size={260} includeMargin />
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                        alignItems="center"
                      >
                        <Chip
                          size="small"
                          label={`läuft ab in ${secondsLeft}s`}
                          color={secondsLeft > 10 ? 'default' : 'warning'}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`exp: ${formatExp(expEpoch)}`}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`jti: ${jti.slice(0, 8)}…`}
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Gerätegebunden – funktioniert nur auf diesem Gerät.
                      </Typography>
                      {inlineErr && (
                        <Alert severity="error" sx={{ width: '100%' }}>
                          {inlineErr}
                        </Alert>
                      )}
                    </>
                  ) : (
                    <Alert severity="info" sx={{ width: '100%' }}>
                      Noch kein Token generiert. Klicke auf „QR-Token
                      generieren/erneuern“.
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

      {/* Pop-up für „Untrusted device – admin approval required“ */}
      <Dialog
        open={deviceDialogOpen}
        onClose={() => setDeviceDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Gerät nicht vertrauenswürdig</DialogTitle>
        <DialogContent>
          <Typography>
            {deviceDialogMsg ||
              'Dieses Gerät wurde noch nicht freigegeben. Bitte kontaktiere das Team, um die Freigabe zu erhalten.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeviceDialogOpen(false)} autoFocus>
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

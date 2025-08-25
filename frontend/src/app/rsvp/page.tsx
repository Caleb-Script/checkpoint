// /web/src/app/rsvp/page.tsx
'use client';

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
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useAuth } from '@/context/AuthContext'; // liefert den Keycloak-User (siehe Projekt) :contentReference[oaicite:1]{index=1}
import { EVENT_BY_ID } from '../../graphql/event/query';
import {
  ACCEPT_INVITATION,
  CREATE_PLUS_ONES_INVITATION,
  UPDATE_INVITATION,
} from '../../graphql/invitation/mutation';
import { INVITATION } from '../../graphql/invitation/query';

function getClaim<T = any>(user: any, key: string): T | null {
  if (!user) return null;
  // 1) direkter Claim (so wie im Beispiel-JWT)
  if (key in user) return (user as any)[key] as T;
  // 2) evtl. in attributes (Keycloak UserInfo-Variante)
  if (user.attributes && key in user.attributes)
    return (user.attributes as any)[key] as T;
  return null;
}

export default function RsvpPage() {
  const sp = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // :contentReference[oaicite:2]{index=2}

  // 1) Query-Param → Vorrang
  const invFromQuery = sp.get('inv') ?? '';

  // 2) Falls kein Query-Param: aus Keycloak-Token
  //    invitationId ist laut Beispiel ein String
  const invFromTokenRaw = getClaim<string | string[]>(user, 'invitationId');
  const invFromToken = Array.isArray(invFromTokenRaw)
    ? (invFromTokenRaw[0] ?? '')
    : (invFromTokenRaw ?? '');

  const invId = invFromQuery || invFromToken || '';

  const { data, loading, error, refetch } = useQuery(INVITATION, {
    variables: { id: invId },
    skip: !invId,
    fetchPolicy: 'cache-and-network',
  });
  const invitation = data?.invitation ?? null;

  // Event-Infos separat (optional, schönere Überschrift)
  const { data: evData } = useQuery(EVENT_BY_ID, {
    variables: { id: invitation?.eventId ?? '' },
    skip: !invitation?.eventId,
    fetchPolicy: 'cache-first',
  });
  const event = evData?.event ?? null;

  // acceptInvitation (E-Mail optional)
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const [acceptInvitation, { loading: accepting }] =
    useMutation(ACCEPT_INVITATION);
  const [updateInvitation, { loading: savingRsvp }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: creatingPlusOne }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );

  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const max = invitation?.maxInvitees ?? 0;
  const used = invitation?.plusOnes?.length ?? 0;
  const free = Math.max(0, max - used);

  function toLocal(dt?: string) {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  }

  async function onAccept() {
    setErr(null);
    setMsg(null);
    if (!invId) {
      setErr('Fehlende Invitation-ID.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErr('Bitte Vorname und Nachname angeben.');
      return;
    }
    await acceptInvitation({
      variables: {
        id: invId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null, // optional
      },
    });
    setMsg(
      'Danke für deine Zusage! Dein Profil wurde gespeichert bzw. erstellt.',
    );
    await refetch();
  }

  async function onDecline() {
    setErr(null);
    setMsg(null);
    if (!invId) {
      setErr('Fehlende Invitation-ID.');
      return;
    }
    await updateInvitation({ variables: { id: invId, rsvpChoice: 'NO' } });
    setMsg('Absage gespeichert.');
    await refetch();
  }

  async function addPlusOne() {
    setErr(null);
    setMsg(null);
    if (!invitation) return;
    if (free <= 0) {
      setErr('Kontingent erschöpft.');
      return;
    }
    await createPlusOne({
      variables: {
        eventId: invitation.eventId,
        invitedByInvitationId: invitation.id,
      },
    });
    setMsg(
      'Zusätzliche Einladung (Plus-One) angelegt. Freigabe erfolgt durch das Event-Team.',
    );
    await refetch();
  }

  if (authLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Einladung
      </Typography>

      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Du bist nicht eingeloggt. Bitte anmelden, damit wir deine Einladung
          zuordnen können.
        </Alert>
      )}

      {!invId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Keine <code>invitationId</code> gefunden. Entweder per Link{' '}
          <code>?inv=…</code> öffnen oder im Keycloak-Profil muss{' '}
          <code>invitationId</code> hinterlegt sein.
        </Alert>
      )}

      {loading && invId && (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error.message || error)}
        </Alert>
      )}

      {msg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {invitation && (
        <Card>
          <CardHeader
            title={
              event
                ? `Einladung zu „${event.name}“`
                : `Invitation ${invitation.id}`
            }
            subheader={
              event ? (
                <span>
                  {toLocal(event.startsAt)} – {toLocal(event.endsAt)}
                </span>
              ) : (
                <span>
                  Event-ID: <code>{invitation.eventId}</code>
                </span>
              )
            }
          />
          <CardContent>
            {/* Eigene Angaben für ACCEPT */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Deine Angaben
            </Typography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Vorname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <TextField
                label="Nachname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <TextField
                label="E-Mail (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Falls leer, wird serverseitig eine E-Mail/Username generiert."
              />
            </Stack>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Teilnahme
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Button
                variant="contained"
                disabled={!invId || accepting}
                onClick={onAccept}
              >
                👍 ZUSAGEN
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                disabled={!invId || savingRsvp}
                onClick={onDecline}
              >
                👎 ABSAGEN
              </Button>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2 }}
              useFlexGap
              flexWrap="wrap"
            >
              <Chip label={`Status: ${invitation.status}`} />
              <Chip label={`RSVP: ${invitation.rsvpChoice ?? '—'}`} />
              <Chip
                label={`Approved: ${invitation.approved ? 'Ja' : 'Nein'}`}
                color={invitation.approved ? 'success' : 'default'}
              />
            </Stack>

            {invitation.rsvpChoice === 'YES' && !invitation.approved && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Deine Zusage bedeutet noch kein Ticket. Das Team prüft &amp;
                schaltet frei.
              </Alert>
            )}
            {invitation.approved && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Du bist bestätigt – dein Ticket ist (oder wird gleich)
                verfügbar.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Plus-Ones (nur anlegen & Status einsehen) */}
            {(invitation.maxInvitees ?? 0) > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Zusätzliche Gäste (Plus-Ones)
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={`Max: ${max}`} />
                  <Chip label={`Belegt: ${used}`} />
                  <Chip
                    label={`Frei: ${free}`}
                    color={free > 0 ? 'info' : 'default'}
                  />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={addPlusOne}
                    disabled={creatingPlusOne || free <= 0}
                  >
                    Plus-One hinzufügen
                  </Button>
                </Stack>

                {invitation.plusOnes && invitation.plusOnes.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invitation ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>RSVP</TableCell>
                        <TableCell>Approved</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invitation.plusOnes.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.id}</TableCell>
                          <TableCell>{c.status}</TableCell>
                          <TableCell>{c.rsvpChoice ?? '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={c.approved ? 'Ja' : 'Nein'}
                              color={c.approved ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Noch keine Plus-Ones angelegt.
                  </Typography>
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  Hinweis: Plus-Ones müssen vom Event-Team freigegeben werden.
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

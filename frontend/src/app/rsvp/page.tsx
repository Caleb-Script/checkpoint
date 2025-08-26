// /web/src/app/rsvp/page.tsx
'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
import * as React from 'react';

import { EVENT_BY_ID } from '../../graphql/event/query';
import {
  ACCEPT_INVITATION,
  CREATE_PLUS_ONES_INVITATION,
  UPDATE_INVITATION,
} from '../../graphql/invitation/mutation';
import { INVITATION } from '../../graphql/invitation/query';
import type { Invitation } from '../../types/invitation/invitation.type';

export default function RsvpPage(): JSX.Element {
  // Invitation-ID aus URL (?inv=…)
  const [invId, setInvId] = React.useState<string>('');
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInvId(params.get('inv') ?? '');
  }, []);

  const { data, loading, error, refetch } = useQuery<{
    invitation: Invitation | null;
  }>(INVITATION, {
    variables: { id: invId },
    skip: !invId,
    fetchPolicy: 'cache-and-network',
  });
  const invitation = data?.invitation ?? null;

  // Event-Infos (schönere Überschrift)
  const { data: evData } = useQuery(EVENT_BY_ID, {
    variables: { id: invitation?.eventId ?? '' },
    skip: !invitation?.eventId,
    fetchPolicy: 'cache-first',
  });
  const event = evData?.event ?? null;

  // Mutations
  const [acceptInvitation, { loading: accepting }] =
    useMutation(ACCEPT_INVITATION);
  const [updateInvitation, { loading: savingRsvp }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: creatingPlusOne }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );

  // Accept-Form Felder
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');

  // UI-Status
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Der einfache Lock:
  const isLocked = Boolean(
    invitation?.approved || invitation?.rsvpChoice != null,
  );

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

  // Actions
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
        email: email.trim() || null,
      },
    });
    setMsg('Danke! Deine Zusage wurde gespeichert.');
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
    setMsg('Plus-One Einladung angelegt. Freigabe durch das Team folgt.');
    await refetch();
  }

  // Rendering
  if (!invId) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
        <Alert severity="warning">
          Keine <code>inv</code>-Query in der URL. Öffne diese Seite mit{' '}
          <code>?inv=&lt;InvitationID&gt;</code>.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 800 }}>
        Einladung
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error.message)}
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
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            title={
              event
                ? `Einladung zu „${event.name}“`
                : `Invitation ${invitation.id}`
            }
            subheader={
              event
                ? `${toLocal(event.startsAt)} – ${toLocal(event.endsAt)}`
                : `Event: ${invitation.eventId}`
            }
          />
          <CardContent>
            {/* Vor dem ersten RSVP: Hinweis auf Endgültigkeit */}
            {!isLocked && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Wichtig:</strong> Sobald du hier eine RSVP abgibst
                (Zusage oder Absage), kannst du deine Entscheidung nicht mehr
                ändern, <em>bis</em> dein Account zugewiesen ist.
              </Alert>
            )}

            {/* RSVP Sektion */}
            {!isLocked ? (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
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
                    helperText="Du kannst diese Angabe leer lassen."
                  />
                </Stack>

                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Teilnahme
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Button
                    variant="contained"
                    onClick={onAccept}
                    disabled={accepting}
                  >
                    👍 Zusagen
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onDecline}
                    disabled={savingRsvp}
                  >
                    👎 Absagen
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Deine RSVP wurde gespeichert
                  {invitation.approved
                    ? ' und du bist bereits bestätigt.'
                    : '.'}
                </Alert>

                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Zusammenfassung
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mb: 2 }}
                >
                  <Chip label={`Status: ${invitation.status}`} />
                  <Chip label={`RSVP: ${invitation.rsvpChoice ?? '—'}`} />
                  <Chip
                    label={`Approved: ${invitation.approved ? 'Ja' : 'Nein'}`}
                    color={invitation.approved ? 'success' : 'default'}
                  />
                </Stack>
              </>
            )}

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

            {/* Plus-Ones — können auch nach Lock verwaltet/angelegt werden */}
            {(invitation.maxInvitees ?? 0) > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                  Zusätzliche Gäste (Plus-Ones)
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2 }}
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Chip label={`Max: ${max}`} />
                  <Chip label={`Belegt: ${used}`} />
                  <Chip
                    label={`Frei: ${free}`}
                    color={free > 0 ? 'info' : 'default'}
                  />
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
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
                      {invitation.plusOnes.map((c) => (
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

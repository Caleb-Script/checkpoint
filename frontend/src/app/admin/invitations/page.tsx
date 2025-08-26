// /web/src/app/invitations/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShareIcon from '@mui/icons-material/Share';
import { EVENTS } from '../../../graphql/event/query';
import { CREATE_INVITATION, UPDATE_INVITATION } from '../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../graphql/invitation/query';
import { copyToClipboard, rsvpLinkForInvitationId, tryNativeShare, whatsappShareUrl } from '../../../lib/link';
import { EventsQueryResult } from '../../../types/event/event.type';
import { InvitationsQueryResult, Invitation } from '../../../types/invitation/invitation.type';


export default function InvitationsPage(): React.JSX.Element {
  const search = useSearchParams();
  const router = useRouter();
  const selectedEventId = search.get('eventId') ?? '';

  // Events für Select laden
  const {
    data: evData,
    loading: evLoading,
    error: evError,
  } = useQuery<EventsQueryResult>(EVENTS, { fetchPolicy: 'cache-and-network' });
  const events = evData?.events ?? [];

  // Einladungen laden
  const { data, loading, error, refetch } = useQuery<InvitationsQueryResult>(
    INVITATIONS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [form, setForm] = React.useState<{
    eventId: string;
    maxInvitees: number;
  }>({
    eventId: selectedEventId,
    maxInvitees: 0,
  });
  React.useEffect(() => {
    // Form-EventId immer an URL-Param angleichen
    setForm((f) => ({ ...f, eventId: selectedEventId }));
  }, [selectedEventId]);

  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const [createInvitation, { loading: creating }] = useMutation<
    { createInvitation: Invitation },
    { eventId: string; maxInvitees?: number }
  >(CREATE_INVITATION, {
    update(cache, { data }) {
      const created = data?.createInvitation;
      if (!created) return;
      try {
        const existing = cache.readQuery<InvitationsQueryResult>({
          query: INVITATIONS,
        });
        if (existing?.invitations) {
          cache.writeQuery<InvitationsQueryResult>({
            query: INVITATIONS,
            data: { invitations: [created, ...existing.invitations] },
          });
        }
      } catch {
        /* ignore */
      }
    },
    onError(e) {
      setErr(e.message);
    },
    onCompleted() {
      setMsg('Einladung erstellt.');
    },
  });

  const [updateInvitation, { loading: updating }] = useMutation<
    { updateInvitation: Invitation },
    Partial<Invitation> & { id: string }
  >(UPDATE_INVITATION, {
    onError(e) {
      setErr(e.message);
    },
  });

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!form.eventId.trim()) {
      setErr('Bitte Event auswählen.');
      return;
    }
    await createInvitation({
      variables: {
        eventId: form.eventId.trim(),
        maxInvitees: Number(form.maxInvitees || 0),
      },
    });
    // Liste aktualisieren
    await refetch();
  }

  const allRows = data?.invitations ?? [];
  const rows = selectedEventId
    ? allRows.filter((r) => r.eventId === selectedEventId)
    : allRows;

  async function copy(url: string) {
    const ok = await copyToClipboard(url);
    setMsg(ok ? 'Link kopiert.' : 'Kopieren nicht möglich.');
  }

  async function share(inv: Invitation) {
    const url = rsvpLinkForInvitationId(inv.id);
    const title = `Einladung zu Event ${inv.eventId}`;
    const text = `Bitte bestätige deine Teilnahme:\n${url}`;
    const used = await tryNativeShare(title, text, url);
    if (!used)
      window.open(whatsappShareUrl(text), '_blank', 'noopener,noreferrer');
  }

  const handleEventSelect = (value: string) => {
    // URL-Param setzen (ersetzt State der Seite, kein zusätzlicher Eintrag im Verlauf)
    const q = value ? `?eventId=${encodeURIComponent(value)}` : '';
    router.replace(`/invitations${q}`);
  };

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Einladungen
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${rows.length} Einträge`}
              />
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              <IconButton
                aria-label="Aktualisieren"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
              <Button
                component={Link}
                href="/event"
                variant="outlined"
                startIcon={<EventIcon />}
                sx={{ borderRadius: 2 }}
              >
                Events
              </Button>
            </Stack>
          }
        />
        <CardContent>
          {(error || err || evError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.message ?? err ?? evError?.message}
            </Alert>
          )}
          {msg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {msg}
            </Alert>
          )}

          {/* Filter: Event-Auswahl */}
          <Grid container spacing={1} sx={{ mb: 1 }} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="event-select-label">Event</InputLabel>
                <Select
                  labelId="event-select-label"
                  label="Event"
                  value={selectedEventId}
                  onChange={(e) => handleEventSelect(String(e.target.value))}
                >
                  <MenuItem value="">
                    <em>Alle Events</em>
                  </MenuItem>
                  {!evLoading &&
                    events.map((ev: EventType) => (
                      <MenuItem key={ev.id} value={ev.id}>
                        {ev.name} —{' '}
                        {new Date(ev.startsAt).toLocaleDateString('de-DE')}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Create Form – nimmt automatisch die gewählte EventId */}
          <Box component="form" onSubmit={onCreate}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="event-create-select-label">
                    Event für neue Einladung
                  </InputLabel>
                  <Select
                    labelId="event-create-select-label"
                    label="Event für neue Einladung"
                    value={form.eventId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        eventId: String(e.target.value),
                      }))
                    }
                    required
                  >
                    {!evLoading &&
                      events.map((ev: EventType) => (
                        <MenuItem key={ev.id} value={ev.id}>
                          {ev.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={8} sm={3}>
                <TextField
                  label="maxInvitees"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={form.maxInvitees}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({
                      ...f,
                      maxInvitees: Number(e.target.value || 0),
                    }))
                  }
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={4} sm="auto">
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  disabled={creating}
                  sx={{ borderRadius: 2, width: '100%' }}
                >
                  Erstellen
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Liste als MOBILE CARDS */}
      {loading && rows.length === 0 && (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {!loading && rows.length === 0 && (
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {selectedEventId
              ? 'Keine Einladungen für dieses Event'
              : 'Noch keine Einladungen'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedEventId
              ? 'Wähle ein anderes Event oder erstelle eine Einladung.'
              : 'Erstelle eine Einladung über das Formular oben.'}
          </Typography>
        </Card>
      )}

      <Stack spacing={1.25}>
        {rows.map((r: Invitation) => {
          const url = rsvpLinkForInvitationId(r.id);
          return (
            <Card key={r.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Invitation
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Event: ${r.eventId}`}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    label={r.status}
                    variant="outlined"
                    color={
                      r.status === 'ACCEPTED'
                        ? 'success'
                        : r.status === 'DECLINED'
                          ? 'error'
                          : 'default'
                    }
                  />
                  <Chip
                    size="small"
                    label={`RSVP: ${r.rsvpChoice ?? '—'}`}
                    variant="outlined"
                    color={
                      r.rsvpChoice === 'YES'
                        ? 'success'
                        : r.rsvpChoice === 'NO'
                          ? 'error'
                          : 'default'
                    }
                  />
                  <Chip
                    size="small"
                    label={`maxInvitees: ${r.maxInvitees}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={r.approved ? 'Approved' : 'Unapproved'}
                    color={r.approved ? 'success' : 'default'}
                    variant={r.approved ? 'filled' : 'outlined'}
                  />
                </Stack>

                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={url}
                      size="small"
                      fullWidth
                      inputProps={{ readOnly: true }}
                    />
                    <Tooltip title="Link kopieren">
                      <IconButton onClick={() => copy(url)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Teilen (System/WhatsApp)">
                      <IconButton onClick={() => share(r)}>
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                  >
                    <Tooltip title="Approven">
                      <span>
                        <Button
                          size="small"
                          startIcon={<DoneAllIcon />}
                          onClick={() =>
                            updateInvitation({
                              variables: { id: r.id, approved: true },
                            })
                          }
                          disabled={updating || r.approved}
                          sx={{ borderRadius: 2 }}
                        >
                          Approven
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="RSVP YES">
                      <span>
                        <Button
                          size="small"
                          startIcon={<CheckIcon />}
                          onClick={() =>
                            updateInvitation({
                              variables: { id: r.id, rsvpChoice: 'YES' },
                            })
                          }
                          disabled={updating}
                          sx={{ borderRadius: 2 }}
                        >
                          RSVP YES
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="RSVP NO">
                      <span>
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<CloseIcon />}
                          onClick={() =>
                            updateInvitation({
                              variables: { id: r.id, rsvpChoice: 'NO' },
                            })
                          }
                          disabled={updating}
                          sx={{ borderRadius: 2 }}
                        >
                          RSVP NO
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Footer-Actions */}
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          component={Link}
          href="/event"
          variant="outlined"
          startIcon={<EventIcon />}
          sx={{ borderRadius: 2 }}
        >
          Zur Event-Übersicht
        </Button>
      </CardActions>
    </Stack>
  );
}

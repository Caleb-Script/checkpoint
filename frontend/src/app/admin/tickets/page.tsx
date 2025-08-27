// /web/src/app/tickets/page.tsx
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
  CircularProgress,
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

import ChairAltIcon from '@mui/icons-material/ChairAlt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Suspense } from 'react';
import { EVENTS } from '../../../graphql/event/query';
import { DELETE_TICKET } from '../../../graphql/ticket/mutation';
import { GET_TICKETS } from '../../../graphql/ticket/query';
import { copyToClipboard } from '../../../lib/link';
import { Event, EventsQueryResult } from '../../../types/event/event.type';
import { GetTicketsResult, Ticket } from '../../../types/ticket/ticket.type';

const tz = 'Europe/Berlin';
function _toLocal(dt: string | number | Date): string {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(dt));
  } catch {
    return String(dt);
  }
}

function TicketsInnerPage() {
  const search = useSearchParams();
  const router = useRouter();
  const selectedEventId = search.get('eventId') ?? '';

  // Events für Select
  const {
    data: evData,
    loading: evLoading,
    error: evError,
  } = useQuery<EventsQueryResult>(EVENTS, { fetchPolicy: 'cache-and-network' });
  const events = evData?.events ?? [];

  // Tickets
  const { data, loading, error, refetch } = useQuery<GetTicketsResult>(
    GET_TICKETS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [deleteTicket, { loading: deleting }] = useMutation<
    { deleteTicket: Ticket },
    { id: string }
  >(DELETE_TICKET, {
    onCompleted: () => setMsg('Ticket gelöscht.'),
    onError: (e) => setErr(e.message),
    refetchQueries: [{ query: GET_TICKETS }],
  });

  const allTickets = data?.getTickets ?? [];
  const tickets = selectedEventId
    ? allTickets.filter((t) => t.eventId === selectedEventId)
    : allTickets;

  const handleEventSelect = (value: string) => {
    const q = value ? `?eventId=${encodeURIComponent(value)}` : '';
    router.replace(`/tickets${q}`);
  };

  async function handleDelete(id: string) {
    setErr(null);
    setMsg(null);
    const ok = window.confirm('Ticket wirklich löschen?');
    if (!ok) return;
    await deleteTicket({ variables: { id } });
  }

  async function copy(text: string) {
    const ok = await copyToClipboard(text);
    setMsg(ok ? 'In Zwischenablage kopiert.' : 'Konnte nicht kopieren.');
  }

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header */}
      <Card variant="outlined">
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Tickets
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${tickets.length} Einträge`}
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
            <Grid sx={{ xs: 12, sm: 6 }}>
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
                    events.map((ev: Event) => (
                      <MenuItem key={ev.id} value={ev.id}>
                        {ev.name} —{' '}
                        {new Date(ev.startsAt).toLocaleDateString('de-DE')}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Liste als MOBILE CARDS */}
      {loading && tickets.length === 0 && (
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

      {!loading && tickets.length === 0 && (
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}
        >
          <ConfirmationNumberIcon fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
            {selectedEventId
              ? 'Keine Tickets für dieses Event'
              : 'Noch keine Tickets'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Erzeuge Tickets über „Gäste einladen“ auf der Event-Detailseite.
          </Typography>
        </Card>
      )}

      <Stack spacing={1.25}>
        {tickets.map((t) => (
          <Card key={t.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ConfirmationNumberIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Ticket
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Chip
                  size="small"
                  label={t.currentState === 'INSIDE' ? 'Inside' : 'Outside'}
                  color={t.currentState === 'INSIDE' ? 'success' : 'default'}
                  variant={t.currentState === 'INSIDE' ? 'filled' : 'outlined'}
                />
                {t.revoked && (
                  <Chip size="small" label="Revoked" color="error" />
                )}
              </Stack>

              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon fontSize="small" />
                  <Typography variant="body2">Event: {t.eventId}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PersonIcon fontSize="small" />
                  <Typography variant="body2">
                    Invitation: {t.invitationId}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ChairAltIcon fontSize="small" />
                  <Typography variant="body2">
                    Seat: {t.seatId ?? '—'}
                  </Typography>
                </Stack>
                {t.deviceBoundKey && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <QrCode2Icon fontSize="small" />
                    <Typography variant="body2">
                      Device Key: {t.deviceBoundKey}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <TextField
                  value={t.id}
                  size="small"
                  fullWidth
                  inputProps={{ readOnly: true }}
                />
                <Tooltip title="Ticket-ID kopieren">
                  <IconButton onClick={() => copy(t.id)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ticket löschen">
                  <span>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting}
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </CardContent>

            <CardActions sx={{ pt: 0, pb: 1.5, px: 2 }}>
              <Button
                component={Link}
                href={`/event/${encodeURIComponent(t.eventId)}`}
                variant="outlined"
                size="small"
                startIcon={<EventIcon />}
                sx={{ borderRadius: 2 }}
              >
                Zum Event
              </Button>
              <Button
                component={Link}
                href={`/invitations?eventId=${encodeURIComponent(t.eventId)}`}
                variant="outlined"
                size="small"
                startIcon={<PersonIcon />}
                sx={{ borderRadius: 2 }}
              >
                Einladungen
              </Button>
              <Box sx={{ flex: 1 }} />
              <Chip size="small" variant="outlined" label={`ID: ${t.id}`} />
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

// Default Export mit Suspense-Wrapper
export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <TicketsInnerPage />
    </Suspense>
  );
}

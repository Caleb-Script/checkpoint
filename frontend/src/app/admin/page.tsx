// /web/src/app/admin/page.tsx
'use client';

import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
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
  Typography,
} from '@mui/material';

import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';

import { useAuth } from '../../context/AuthContext';
import { EVENTS } from '../../graphql/event/query';
import { INVITATIONS } from '../../graphql/invitation/query';
import { GET_TICKETS } from '../../graphql/ticket/query';

import type {
  EventsQueryResult,
  Event as EventType,
} from '../../types/event/event.type';
import type { InvitationsQueryResult } from '../../types/invitation/invitation.type';

type TicketRow = {
  id: string;
  eventId: string;
  invitationId: string;
  seatId?: string | null;
  currentState: 'INSIDE' | 'OUTSIDE';
};

type GetTicketsResult = { getTickets: TicketRow[] };

export default function AdminHomePage(): JSX.Element {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const roles: string[] = Array.isArray(user?.roles)
    ? (user?.roles as string[])
    : [];
  const isAdmin = roles.includes('ADMIN');

  const search = useSearchParams();
  const router = useRouter();
  const selectedEventId = search.get('eventId') ?? '';

  // GraphQL Queries
  const {
    data: evData,
    loading: evLoading,
    error: evError,
    refetch: refetchEvents,
  } = useQuery<EventsQueryResult>(EVENTS, { fetchPolicy: 'cache-and-network' });

  const {
    data: invData,
    loading: invLoading,
    error: invError,
    refetch: refetchInvs,
  } = useQuery<InvitationsQueryResult>(INVITATIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: tixData,
    loading: tixLoading,
    error: tixError,
    refetch: refetchTix,
  } = useQuery<GetTicketsResult>(GET_TICKETS, {
    fetchPolicy: 'cache-and-network',
  });

  const events = evData?.events ?? [];
  const invitations = invData?.invitations ?? [];
  const tickets = tixData?.getTickets ?? [];

  const filteredInvs = selectedEventId
    ? invitations.filter((i) => i.eventId === selectedEventId)
    : invitations;

  const filteredTix = selectedEventId
    ? tickets.filter((t) => t.eventId === selectedEventId)
    : tickets;

  const loadingAny = evLoading || invLoading || tixLoading;
  const errorMsg =
    evError?.message ?? invError?.message ?? tixError?.message ?? null;

  const handleRefresh = async () => {
    await Promise.all([refetchEvents(), refetchInvs(), refetchTix()]);
  };

  const handleEventSelect = (value: string) => {
    const q = value ? `?eventId=${encodeURIComponent(value)}` : '';
    router.replace(`/admin${q}`);
  };

  // --- Auth State ---
  if (authLoading) {
    return (
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Admin" />
          <CardContent>
            <Skeleton height={20} width="50%" />
            <Skeleton height={20} width="35%" />
            <Skeleton height={120} />
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <Stack spacing={2} sx={{ pb: 1 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
            title="Kein Zugriff"
          />
          <CardContent>
            <Stack spacing={1.5} alignItems="flex-start">
              <Stack direction="row" spacing={1} alignItems="center">
                <LockPersonIcon />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  403 – Adminrechte erforderlich
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Für diese Seite benötigst du die Rolle <b>ADMIN</b>.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  component={Link}
                  href="/"
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Zur Startseite
                </Button>
                <Button
                  component={Link}
                  href="/admin/event"
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Zu den Events
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  // --- Admin Dashboard ---
  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header */}
      <Card variant="outlined">
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title="Admin"
          action={
            <IconButton
              aria-label="Aktualisieren"
              onClick={handleRefresh}
              disabled={loadingAny}
            >
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {/* Event-Filter + KPIs */}
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} sm={7}>
              <FormControl fullWidth size="small">
                <InputLabel id="event-select-label">Event-Kontext</InputLabel>
                <Select
                  labelId="event-select-label"
                  label="Event-Kontext"
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
            <Grid item xs={12} sm={5}>
              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                flexWrap="wrap"
              >
                <Chip size="small" label={`Events: ${events.length}`} />
                <Chip
                  size="small"
                  label={`Einladungen: ${filteredInvs.length}`}
                />
                <Chip size="small" label={`Tickets: ${filteredTix.length}`} />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Schnellzugriffe */}
      <Grid container spacing={1.25}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea component={Link} href="/admin/event">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Events verwalten
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Events erstellen, Zeiten & Re-Entry setzen, Seats
                  anlegen/importieren.
                </Typography>
                {evLoading ? (
                  <Skeleton width={120} sx={{ mt: 1 }} />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${events.length} Einträge`}
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea
              component={Link}
              href={
                selectedEventId
                  ? `/admin/invitations?eventId=${encodeURIComponent(selectedEventId)}`
                  : '/admin/invitations'
              }
            >
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PersonAddIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Einladungen
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Einladungen erstellen, teilen, Approvals & RSVP steuern.
                </Typography>
                {invLoading ? (
                  <Skeleton width={140} sx={{ mt: 1 }} />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      selectedEventId
                        ? `${filteredInvs.length} für aktives Event`
                        : `${invitations.length} gesamt`
                    }
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea
              component={Link}
              href={
                selectedEventId
                  ? `/admin/tickets?eventId=${encodeURIComponent(selectedEventId)}`
                  : '/admin/tickets'
              }
            >
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ConfirmationNumberIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Tickets
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Ticket-Zustand (Inside/Outside), Seat-Zuweisung,
                  Revoke/Löschen.
                </Typography>
                {tixLoading ? (
                  <Skeleton width={120} sx={{ mt: 1 }} />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      selectedEventId
                        ? `${filteredTix.length} für aktives Event`
                        : `${tickets.length} gesamt`
                    }
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea component={Link} href="/scan">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <QrCodeScannerIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Scan-Modus (Security)
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  QR scannen für Einlass/Einlass-Kontrolle (Inside/Outside).
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<SecurityIcon />}
                  label="Security Zugriff"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Platzhalter: Benutzer/Rollen & Einstellungen */}
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea component={Link} href="/admin/users">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GroupIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Benutzer & Rollen
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Rollen (ADMIN/SECURITY/GUEST) verwalten, Profile ansehen.
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label="Keycloak"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea component={Link} href="/admin/settings">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SettingsIcon />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Einstellungen
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Defaults (Rotation, Re-Entry), Branding, WhatsApp-Template.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* Kontext-Aktionen */}
      <Box>
        <Grid container spacing={1.25}>
          <Grid item xs={12} sm="auto">
            <Button
              component={Link}
              href="/admin/event/new"
              variant="contained"
              startIcon={<EventIcon />}
              sx={{ borderRadius: 2, width: '100%' }}
            >
              Neues Event anlegen
            </Button>
          </Grid>
          {selectedEventId && (
            <>
              <Grid item xs={12} sm="auto">
                <Button
                  component={Link}
                  href={`/admin/event/${encodeURIComponent(selectedEventId)}`}
                  variant="outlined"
                  sx={{ borderRadius: 2, width: '100%' }}
                >
                  Zum Event
                </Button>
              </Grid>
              <Grid item xs={12} sm="auto">
                <Button
                  component={Link}
                  href={`/admin/event/${encodeURIComponent(selectedEventId)}/invite`}
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  sx={{ borderRadius: 2, width: '100%' }}
                >
                  Gäste einladen
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Stack>
  );
}

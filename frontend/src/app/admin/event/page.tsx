// /web/src/app/event/page.tsx
'use client';

import { useQuery } from '@apollo/client';
import Link from 'next/link';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';

import { EVENTS } from '../../../graphql/event/query';
import type { EventsQueryResult } from '../../../types/event/event.type';
import { getLogger } from '../../../utils/logger';

// ——— Helpers ———
const tz = 'Europe/Berlin';
function toLocal(dt: string | number | Date): string {
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

export default function EventsListPage() {
  const logger = getLogger(EventsListPage.name);

  const { data, loading, error, refetch } = useQuery<EventsQueryResult>(
    EVENTS,
    {
      fetchPolicy: 'cache-and-network',
      onError: (e) => logger.error(e),
    },
  );

  const events = data?.events ?? [];

  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header-Karte im iOS-Look */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Events
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${events.length} Einträge`}
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
                href="/event/new"
                variant="contained"
                startIcon={<AddCircleIcon />}
                sx={{ borderRadius: 2 }}
              >
                Neues Event
              </Button>
            </Stack>
          }
        />
        {loading && !data && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Skeleton height={4} />
          </Box>
        )}
        <CardContent sx={{ pt: 0 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}

          {/* Empty State */}
          {!loading && events.length === 0 && (
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                textAlign: 'center',
                p: 3,
                bgcolor: 'background.paper',
              }}
            >
              <EventIcon fontSize="large" />
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                Noch keine Events
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 2 }}
              >
                Lege dein erstes Event an und verschicke Einladungen.
              </Typography>
              <Button
                component={Link}
                href="/event/new"
                variant="contained"
                startIcon={<AddCircleIcon />}
                sx={{ borderRadius: 2 }}
              >
                Event erstellen
              </Button>
            </Card>
          )}

          {/* Liste als mobile Cards */}
          <Stack spacing={1.25}>
            {loading && events.length === 0 && (
              <>
                {[1, 2, 3].map((k) => (
                  <Card key={k} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Skeleton width="60%" />
                      <Skeleton width="40%" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {events.map((ev) => (
              <Card key={ev.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ pb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {ev.name}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {typeof ev.maxSeats === 'number' && (
                      <Chip
                        size="small"
                        label={`Max ${ev.maxSeats}`}
                        variant="outlined"
                      />
                    )}
                    <Chip
                      size="small"
                      label={ev.allowReEntry ? 'Re-Entry an' : 'Re-Entry aus'}
                      color={ev.allowReEntry ? 'success' : 'default'}
                      variant={ev.allowReEntry ? 'filled' : 'outlined'}
                    />
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {toLocal(ev.startsAt)} — {toLocal(ev.endsAt)} • Rotation:{' '}
                    <strong>{ev.rotateSeconds}s</strong>
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    ID: {ev.id}
                  </Typography>
                </CardContent>

                <CardActions sx={{ pt: 0, pb: 1.5, px: 2 }}>
                  <Button
                    component={Link}
                    href={`/event/${ev.id}`}
                    size="medium"
                    variant="contained"
                    sx={{ borderRadius: 2 }}
                  >
                    Details
                  </Button>
                  <Button
                    component={Link}
                    href={`/invitations?eventId=${ev.id}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 2, ml: 'auto' }}
                  >
                    Einladungen
                  </Button>
                  <Button
                    component={Link}
                    href={`/tickets?eventId=${encodeURIComponent(ev.id)}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    Tickets
                  </Button>
                </CardActions>

                <Divider />
              </Card>
            ))}
          </Stack>
        </CardContent>

        {/* Footer-Actions (zweiter CTA) */}
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            component={Link}
            href="/event/new"
            variant="contained"
            startIcon={<AddCircleIcon />}
            sx={{ borderRadius: 2 }}
          >
            Event erstellen
          </Button>
        </CardActions>
      </Card>
    </Stack>
  );
}

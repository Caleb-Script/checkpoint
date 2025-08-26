// /web/src/app/event/page.tsx
'use client';

import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { EVENTS } from '../../graphql/event/query';
import { EventsQueryResult } from '../../types/event/event.type';
import { getLogger } from '../../utils/logger';

export default function EventsListPage() {
  const logger = getLogger(EventsListPage.name);
  const { data, loading, error, refetch } = useQuery<EventsQueryResult>(
    EVENTS,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const events = data?.events ?? [];

  return (
    <Card variant="outlined">
      <CardHeader
        title="Events"
        titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/event/new" variant="contained">
              Neues Event
            </Button>
            <Button onClick={() => refetch()} variant="outlined">
              Aktualisieren
            </Button>
          </Stack>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        {loading && !data && <Typography>Wird geladen…</Typography>}
        {!loading && events.length === 0 && (
          <Typography>Keine Events gefunden.</Typography>
        )}
        {events.length > 0 && (
          <List>
            {events.map((ev) => (
              <ListItem key={ev.id} divider alignItems="flex-start">
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={700}>{ev.name}</Typography>
                      {typeof ev.maxSeats === 'number' && (
                        <Chip label={`Max ${ev.maxSeats}`} size="small" />
                      )}
                    </Stack>
                  }
                  secondary={
                    <>
                      {new Date(ev.startsAt).toLocaleString()} –{' '}
                      {new Date(ev.endsAt).toLocaleString()}
                      {' • Re‑Entry: '}
                      {ev.allowReEntry ? 'Ja' : 'Nein'}
                      {' • Rotation: '}
                      {ev.rotateSeconds}s
                    </>
                  }
                />
                <Stack alignItems="flex-end" gap={1}>
                  <Button
                    component={Link}
                    href={`/event/${ev.id}`}
                    size="small"
                  >
                    Details
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    ID: {ev.id}
                  </Typography>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button component={Link} href="/event/new" variant="contained">
          Event erstellen
        </Button>
      </CardActions>
    </Card>
  );
}

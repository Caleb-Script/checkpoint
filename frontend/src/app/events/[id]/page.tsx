// checkpoint/web/src/app/events/[id]/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  CREATE_SEAT,
  DELETE_EVENT,
  IMPORT_SEATS,
  UPDATE_EVENT,
} from '../../../graphql/event/mutation';
import { EVENT_BY_ID, EVENT_SEATS } from '../../../graphql/event/query';

type EventDto = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  allowReEntry: boolean;
  rotateSeconds: number;
  maxSeats: number;
  createdAt: string;
  updatedAt: string;
};

type SeatDto = {
  id: string;
  eventId: string;
  section?: string | null;
  row?: string | null;
  number?: string | null;
  note?: string | null;
  table?: string | null;
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id as string;

  const [allow, setAllow] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Seats Pagination/Filter
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [filter, setFilter] = React.useState('');

  // CSV/Text Import State
  const [csvText, setCsvText] = React.useState('');

  // Create Seat Form
  const [seatForm, setSeatForm] = React.useState<Partial<SeatDto>>({
    section: '',
    row: '',
    number: '',
    note: '',
    table: '',
  });

  const { data, loading, refetch } = useQuery<{ event: EventDto }>(
    EVENT_BY_ID,
    {
      variables: { id: eventId },
      onCompleted: (res) => setAllow(res.event.allowReEntry),
      onError: (e) => setError(e.message),
      fetchPolicy: 'cache-and-network',
    },
  );

  const {
    data: seatsData,
    loading: seatsLoading,
    refetch: refetchSeats,
  } = useQuery<{ eventSeats: SeatDto[]; eventSeatsCount: number }>(
    EVENT_SEATS,
    {
      variables: {
        eventId,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        filter: filter || null,
      },
      fetchPolicy: 'cache-and-network',
      onError: () => {
        // Falls Backend diesen Query (noch) nicht hat, die Seite bleibt sonst verwendbar
      },
    },
  );

  const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT, {
    variables: { input: { id: eventId, allowReEntry: allow } },
    onError: (e) => setError(e.message),
    onCompleted: async () => {
      await refetch();
    },
  });

  const [deleteEvent, { loading: deleting }] = useMutation(DELETE_EVENT, {
    variables: { id: eventId },
    onError: (e) => setError(e.message),
    onCompleted: () => {
      router.replace('/events');
    },
    update(cache) {
      // optional: Events-Liste aus dem Cache entfernen
      try {
        const id = cache.identify({ __typename: 'Event', id: eventId });
        if (id) cache.evict({ id });
        cache.gc();
      } catch {}
    },
  });

  const [createSeat, { loading: creatingSeat }] = useMutation(CREATE_SEAT, {
    onError: (e) => setError(e.message),
    onCompleted: async () => {
      await refetchSeats();
      setSeatForm({ section: '', row: '', number: '', note: '', table: '' });
    },
  });

  const [importSeats, { loading: importing }] = useMutation(IMPORT_SEATS, {
    onError: (e) => setError(e.message),
    onCompleted: async () => {
      await refetchSeats();
      setCsvText('');
    },
  });

  function toLocal(dt: string) {
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  }

  function parseCSV(text: string): Array<Omit<SeatDto, 'id'>> {
    // Unterstützt Komma oder Semikolon als Trenner. Erste Zeile = Header.
    // erlaubte Header: section,row,number,note,table
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);

    const out: Array<Omit<SeatDto, 'id'>> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim());
      const seat = {
        eventId,
        section: idx('section') >= 0 ? parts[idx('section')] || null : null,
        row: idx('row') >= 0 ? parts[idx('row')] || null : null,
        number: idx('number') >= 0 ? parts[idx('number')] || null : null,
        note: idx('note') >= 0 ? parts[idx('note')] || null : null,
        table: idx('table') >= 0 ? parts[idx('table')] || null : null,
      } as Omit<SeatDto, 'id'>;
      out.push(seat);
    }
    return out;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function onImport() {
    setError(null);
    const seats = parseCSV(csvText);
    if (seats.length === 0) {
      setError(
        'CSV/Text leer oder Header fehlen. Erwartet: section,row,number,note[,table]',
      );
      return;
    }
    await importSeats({ variables: { input: { eventId, seats } } });
  }

  async function onCreateSeat(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    await createSeat({
      variables: {
        input: {
          eventId,
          section: seatForm.section || null,
          row: seatForm.row || null,
          number: seatForm.number || null,
          note: seatForm.note || null,
          table: seatForm.table || null,
        },
      },
    });
  }

  const ev = data?.event;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && <Typography>Wird geladen…</Typography>}
          {!loading && ev && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {ev.name}{' '}
                <Chip
                  size="small"
                  label={ev.allowReEntry ? 'Re-Entry: an' : 'Re-Entry: aus'}
                  color={ev.allowReEntry ? 'success' : 'default'}
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
                {toLocal(ev.startsAt)} — {toLocal(ev.endsAt)}
                {' • Rotation: '}
                {ev.rotateSeconds}s
                {typeof ev.maxSeats === 'number' &&
                  ` • Max Seats: ${ev.maxSeats}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Erstellt: {toLocal(ev.createdAt)} / Letzte Änderung:{' '}
                {toLocal(ev.updatedAt)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm="auto">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allow}
                        onChange={(e) => setAllow(e.target.checked)}
                      />
                    }
                    label="Re-Entry erlauben"
                  />
                </Grid>
                <Grid item xs={12} sm="auto">
                  <Button
                    variant="contained"
                    onClick={() => updateEvent()}
                    disabled={updating}
                  >
                    Änderungen speichern
                  </Button>
                </Grid>
                <Grid item xs={12} sm="auto">
                  <Button
                    color="error"
                    variant="outlined"
                    disabled={deleting}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
                        )
                      ) {
                        deleteEvent();
                      }
                    }}
                  >
                    Event löschen
                  </Button>
                </Grid>
                <Grid item xs={12} sm="auto">
                  <Button
                    component={Link}
                    href={`/events/${eventId}/invitations`}
                    variant="outlined"
                  >
                    Zu den Einladungen
                  </Button>
                </Grid>
                <Grid item xs={12} sm="auto">
                  <Button
                    component={Link}
                    href={`/events/${eventId}/responses`}
                    variant="outlined"
                  >
                    Zu den Responses
                  </Button>
                </Grid>
                <Grid>
                  <Button
                    component={Link}
                    href={`/events/${eventId}/invite`}
                    variant="contained"
                  >
                    Gäste einladen
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seats: Create */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Seat anlegen
          </Typography>
          <Box component="form" onSubmit={onCreateSeat}>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={2}>
                <TextField
                  size="small"
                  label="Section"
                  value={seatForm.section || ''}
                  onChange={(e) =>
                    setSeatForm((s) => ({ ...s, section: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  size="small"
                  label="Row"
                  value={seatForm.row || ''}
                  onChange={(e) =>
                    setSeatForm((s) => ({ ...s, row: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  size="small"
                  label="Number"
                  value={seatForm.number || ''}
                  onChange={(e) =>
                    setSeatForm((s) => ({ ...s, number: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField
                  size="small"
                  label="Table"
                  value={seatForm.table || ''}
                  onChange={(e) =>
                    setSeatForm((s) => ({ ...s, table: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  label="Note"
                  value={seatForm.note || ''}
                  onChange={(e) =>
                    setSeatForm((s) => ({ ...s, note: e.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm="auto">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={creatingSeat}
                  sx={{ mt: { xs: 1, sm: 0 } }}
                >
                  Seat speichern
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Seats: Import */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Seats importieren (CSV/Text)
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Erwartete Header: <code>section,row,number,note[,table]</code> –
            Trennzeichen Komma oder Semikolon.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button variant="outlined" component="label">
              CSV-Datei wählen
              <input
                hidden
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={onFile}
              />
            </Button>
            <Button variant="contained" onClick={onImport} disabled={importing}>
              Import starten
            </Button>
          </Stack>
          <TextField
            label="CSV / Text"
            placeholder={`section,row,number,note,table\nA,1,12,VIP,5`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
          />
        </CardContent>
      </Card>

      {/* Seats: Liste */}
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Seats
            </Typography>
            <TextField
              size="small"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => {
                setPage(0);
                setFilter(e.target.value);
              }}
              sx={{ maxWidth: 280 }}
            />
          </Stack>

          {seatsLoading && <Typography>Seats werden geladen…</Typography>}

          {!seatsLoading && seatsData && (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Section</TableCell>
                    <TableCell>Row</TableCell>
                    <TableCell>Number</TableCell>
                    <TableCell>Table</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seatsData.seatsByEvent.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.section || '—'}</TableCell>
                      <TableCell>{s.row || '—'}</TableCell>
                      <TableCell>{s.number || '—'}</TableCell>
                      <TableCell>{s.table || '—'}</TableCell>
                      <TableCell>{s.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={seatsData.eventSeatsCount ?? 0}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}

          {!seatsLoading && !seatsData && (
            <Alert severity="info">
              Dein GraphQL-Backend liefert (noch) keinen <code>eventSeats</code>
              -Query. Die Seite funktioniert trotzdem
              (Update/Delete/Import/Create).
            </Alert>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

// checkpoint/web/src/app/event/[id]/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import BallotIcon from '@mui/icons-material/Ballot';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SeatIcon from '@mui/icons-material/EventSeat';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import {
  CREATE_SEAT,
  DELETE_EVENT,
  IMPORT_SEATS,
  UPDATE_EVENT,
} from '../../../../graphql/event/mutation';
import { EVENT_BY_ID, EVENT_SEATS } from '../../../../graphql/event/query';
import type { Event } from '../../../../types/event/event.type';
import type { Seat } from '../../../../types/event/seat.type';

// ---------- Typen ----------
type EventByIdResult = { event: Event };
type EventSeatsResult = { seatsByEvent: Seat[]; seatsByEventCount: number };

// ---------- Utilities ----------
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

function parseCSV(text: string, eventId: string): Array<Omit<Seat, 'id'>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const out: Array<Omit<Seat, 'id'>> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim());
    const seat: Omit<Seat, 'id'> = {
      eventId,
      section: idx('section') >= 0 ? parts[idx('section')] || null : null,
      row: idx('row') >= 0 ? parts[idx('row')] || null : null,
      number: idx('number') >= 0 ? parts[idx('number')] || null : null,
      note: idx('note') >= 0 ? parts[idx('note')] || null : null,
      table: idx('table') >= 0 ? parts[idx('table')] || null : null,
    };
    out.push(seat);
  }
  return out;
}

// ---------- Komponente ----------
export default function EventDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [allow, setAllow] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Seats Pagination (mobil: „Mehr laden“)
  const [offset, setOffset] = React.useState<number>(0);
  const [limit] = React.useState<number>(20);

  // CSV Import
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [pendingSeats, setPendingSeats] = React.useState<
    Array<Omit<Seat, 'id'>>
  >([]);
  const [openImportPreview, setOpenImportPreview] =
    React.useState<boolean>(false);

  // Create Seat Form
  const [seatForm, setSeatForm] = React.useState<Partial<Seat>>({
    section: '',
    row: '',
    number: '',
    note: '',
    table: '',
  });

  // Delete Dialog
  const [openDelete, setOpenDelete] = React.useState<boolean>(false);

  // --------- Queries ----------
  const {
    data,
    loading,
    refetch: refetchEvent,
  } = useQuery<EventByIdResult>(EVENT_BY_ID, {
    variables: { id: eventId },
    onCompleted: (res) => setAllow(res.event.allowReEntry),
    onError: (e) => setError(e.message),
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: seatsData,
    loading: seatsLoading,
    refetch: refetchSeats,
  } = useQuery<EventSeatsResult>(EVENT_SEATS, {
    variables: { eventId, offset, limit, filter: null },
    fetchPolicy: 'cache-and-network',
    onError: () => {},
  });

  // --------- Mutations ----------
  const [updateEvent, { loading: updating }] = useMutation(UPDATE_EVENT, {
    variables: { input: { id: eventId, allowReEntry: allow } },
    onError: (e) => setError(e.message),
    onCompleted: async () => void (await refetchEvent()),
  });

  const [deleteEvent, { loading: deleting }] = useMutation(DELETE_EVENT, {
    variables: { id: eventId },
    onError: (e) => setError(e.message),
    onCompleted: () => router.replace('/event'),
    update(cache) {
      try {
        const cacheId = cache.identify({ __typename: 'Event', id: eventId });
        if (cacheId) cache.evict({ id: cacheId });
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
      setPendingSeats([]);
      setSelectedFileName('');
      setOpenImportPreview(false);
    },
  });

  // --------- Handlers ----------
  const handleRefresh = async (): Promise<void> => {
    setError(null);
    await Promise.all([refetchEvent(), refetchSeats()]);
  };

  const handleFilePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text, eventId);
    if (parsed.length === 0) {
      setError(
        'CSV leer oder Header fehlen. Erwartet: section,row,number,note[,table]',
      );
      return;
    }
    setSelectedFileName(file.name);
    setPendingSeats(parsed);
    setOpenImportPreview(true);
  };

  const onConfirmImport = async (): Promise<void> => {
    setError(null);
    await importSeats({
      variables: { input: { eventId, seats: pendingSeats } },
    });
  };

  const onCreateSeat = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
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
  };

  const ev = data?.event;

  // ---------- UI ----------
  return (
    <Stack spacing={2} sx={{ pb: 1 }}>
      {/* Header-Karte */}
      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {ev?.name ?? 'Event'}
              </Typography>
              {ev && (
                <Chip
                  size="small"
                  label={ev.allowReEntry ? 'Re-Entry an' : 'Re-Entry aus'}
                  color={ev.allowReEntry ? 'success' : 'default'}
                />
              )}
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Aktualisieren">
                <span>
                  <IconButton
                    onClick={handleRefresh}
                    disabled={loading || seatsLoading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Event löschen">
                <span>
                  <IconButton
                    color="error"
                    onClick={() => setOpenDelete(true)}
                    disabled={deleting || loading}
                  >
                    <DeleteForeverIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          }
        />
        {loading && <LinearProgress />}
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {ev && (
            <>
              <Typography sx={{ color: 'text.secondary', mb: 0.5 }}>
                {toLocal(ev.startsAt)} — {toLocal(ev.endsAt)} • Rotation:&nbsp;
                <strong>{ev.rotateSeconds}s</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Erstellt: {toLocal(ev.createdAt)} • Geändert:{' '}
                {toLocal(ev.updatedAt)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                alignItems="center"
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={allow}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAllow(e.target.checked)
                      }
                    />
                  }
                  label="Re-Entry erlauben"
                />

                <Button
                  startIcon={<SaveRoundedIcon />}
                  variant="contained"
                  onClick={() => updateEvent()}
                  disabled={updating}
                  sx={{ borderRadius: 2 }}
                >
                  Änderungen speichern
                </Button>

                <Box sx={{ flex: 1 }} />

                <Button
                  component={Link}
                  href={`/event/${eventId}/invite`}
                  variant="contained"
                  color="primary"
                  startIcon={<GroupAddIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Gäste einladen
                </Button>

                <Button
                  component={Link}
                  href={`/invitations?eventId=${eventId}`}
                  variant="outlined"
                  startIcon={<BallotIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Einladungen
                </Button>

                <Button
                  component={Link}
                  href={`/event/${eventId}/responses`}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Responses
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seat anlegen */}
      <Card variant="outlined">
        <CardHeader
          title="Seat anlegen"
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
          avatar={<SeatIcon />}
        />
        <CardContent>
          <Box component="form" onSubmit={onCreateSeat}>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <TextField
                  size="small"
                  label="Section"
                  value={seatForm.section ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, section: e.target.value }))
                  }
                  fullWidth
                  inputMode="text"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  size="small"
                  label="Row"
                  value={seatForm.row ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, row: e.target.value }))
                  }
                  fullWidth
                  inputMode="text"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  size="small"
                  label="Number"
                  value={seatForm.number ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, number: e.target.value }))
                  }
                  fullWidth
                  inputMode="numeric"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  size="small"
                  label="Table"
                  value={seatForm.table ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, table: e.target.value }))
                  }
                  fullWidth
                  inputMode="numeric"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  size="small"
                  label="Note"
                  value={seatForm.note ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, note: e.target.value }))
                  }
                  fullWidth
                  inputMode="text"
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  disabled={creatingSeat}
                  sx={{ borderRadius: 2, mt: 0.5 }}
                >
                  Seat speichern
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Seats importieren – mobil simpel: nur Datei wählen + Preview-Dialog */}
      <Card variant="outlined">
        <CardHeader
          title="Seats importieren"
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
        />
        {importing && <LinearProgress />}
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            CSV mit Header <code>section,row,number,note[,table]</code>{' '}
            auswählen.
          </Typography>
          <Stack spacing={1}>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={handleFilePick}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              startIcon={<UploadFileIcon />}
              variant="contained"
              size="large"
              sx={{ borderRadius: 2 }}
            >
              {selectedFileName ? `Andere Datei wählen` : `CSV wählen`}
            </Button>
            {selectedFileName && (
              <Typography variant="caption" color="text.secondary">
                Gewählt: {selectedFileName}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Seats: Liste als mobile Cards */}
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Seats
        </Typography>

        {seatsLoading && <LinearProgress />}

        {!seatsLoading && seatsData?.seatsByEvent.length === 0 && (
          <Alert severity="info">Noch keine Seats vorhanden.</Alert>
        )}

        {seatsData?.seatsByEvent.map((s) => (
          <Card key={s.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 1.25 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 0.5 }}
              >
                <SeatIcon fontSize="small" />
                <Typography fontWeight={700}>
                  {s.section || '—'} {s.row || ''} {s.number || ''}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {s.table && (
                  <Chip
                    size="small"
                    label={`Table ${s.table}`}
                    variant="outlined"
                  />
                )}
              </Stack>
              {s.note && (
                <Typography variant="body2" color="text.secondary">
                  {s.note}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Mehr laden Button (simple Pagination für Mobile) */}
        {!!seatsData && seatsData.seatsByEventCount > offset + limit && (
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 2 }}
            onClick={async () => {
              const next = offset + limit;
              setOffset(next);
              await refetchSeats({
                eventId,
                offset: next,
                limit,
                filter: null,
              });
            }}
          >
            Mehr laden
          </Button>
        )}
      </Stack>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Event wirklich löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen
            Daten könnten betroffen sein – bitte bestätigen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Abbrechen</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setOpenDelete(false);
              void deleteEvent();
            }}
          >
            Endgültig löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import-Preview Dialog */}
      <Dialog
        open={openImportPreview}
        onClose={() => setOpenImportPreview(false)}
      >
        <DialogTitle>Import prüfen</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Datei: <strong>{selectedFileName || '—'}</strong>
          </DialogContentText>
          <Alert severity="info" sx={{ mb: 2 }}>
            {pendingSeats.length} Seat(s) erkannt. Mit „Import starten“
            bestätigst du den Import.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Beispiel (erste 3):
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {pendingSeats.slice(0, 3).map((s, i) => (
              <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>
                    {s.section || '—'} {s.row || ''} {s.number || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.note || '—'}
                    {s.table ? ` • Table ${s.table}` : ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportPreview(false)}>Abbrechen</Button>
          <Button
            onClick={onConfirmImport}
            variant="contained"
            disabled={pendingSeats.length === 0 || importing}
          >
            Import starten
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// checkpoint/frontend/srv/app/event/[id]/page.tsx
'use client';

import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import {
  Alert,
  Avatar,
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
  Tab,
  Tabs,
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

// ---------- Resulttypen ----------
type EventByIdResult = { event: Event };
type EventSeatsResult = { seatsByEvent: Seat[]; seatsByEventCount: number };

// Gruppierung: Section -> (Table -> Seats)
type SeatsByTable = Record<string, Seat[]>;
type SeatsBySection = Record<string, SeatsByTable>;

type PolarPoint = { left: number; top: number };

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

// CSV: section,table,number,note
function parseCSV(text: string, eventId: string): Array<Omit<Seat, 'id'>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const require = (name: string): number => {
    const i = idx(name);
    if (i < 0) throw new Error(`CSV-Header fehlt: "${name}"`);
    return i;
  };

  // Pflichtfelder prüfen
  const iSection = require('section');
  const iTable = require('table');
  const iNumber = require('number');
  const iNote = idx('note');

  const out: Array<Omit<Seat, 'id'>> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim());
    if (!parts.length) continue;

    const section = parts[iSection] ?? '';
    const table = parts[iTable] ?? '';
    const number = parts[iNumber] ?? '';
    const note = iNote >= 0 ? (parts[iNote] ?? '') : '';

    if (!section || !table || !number) {
      // Zeilen mit fehlenden Pflichtwerten überspringen
      continue;
    }

    const seat: Omit<Seat, 'id'> = {
      eventId,
      section,
      table,
      number,
      note: note || null,
    };
    out.push(seat);
  }
  return out;
}

/** Gleichmäßig verteilte Stuhl-Positionen um runden Tisch */
function computeChairPositions(
  count: number,
  containerPx: number,
  tableDiameterPx: number,
): PolarPoint[] {
  if (count <= 0) return [];
  const radius = (containerPx - tableDiameterPx) / 2;
  const center = containerPx / 2;

  return Array.from({ length: count }).map((_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2; // Start oben
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { left: x, top: y };
  });
}

/** Label-Logik für einen Sitz: bevorzugt number */
function seatLabel(seat: Seat): string {
  const n = seat.number?.trim();
  return n && n.length > 0 ? n : '•';
}

// ---------- TabPanel ----------
function TabPanel(props: {
  children?: React.ReactNode;
  value: number;
  index: number;
}): React.JSX.Element {
  const { children, value, index } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  );
}

// ---------- Tisch-Layout für einen Tisch ----------
function TableCluster(props: {
  sectionName: string;
  tableName: string;
  seats: Seat[];
}): React.JSX.Element {
  // Mobile-first
  const containerSize = 260;
  const containerSizeMd = 320;
  const tableDiameter = 120;
  const tableDiameterMd = 160;
  const chairSize = 36;

  const chairsMobile = computeChairPositions(
    props.seats.length,
    containerSize,
    tableDiameter,
  );
  const chairsMd = computeChairPositions(
    props.seats.length,
    containerSizeMd,
    tableDiameterMd,
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        title={`Tisch ${props.tableName}`}
        subheader={`Section ${props.sectionName} • ${props.seats.length} Sitzplätze`}
        titleTypographyProps={{ variant: 'subtitle1', sx: { fontWeight: 700 } }}
        subheaderTypographyProps={{ variant: 'caption' }}
        avatar={<SeatIcon />}
      />
      <CardContent sx={{ pt: 0 }}>
        <Box
          sx={{
            position: 'relative',
            width: { xs: containerSize, md: containerSizeMd },
            height: { xs: containerSize, md: containerSizeMd },
            mx: 'auto',
          }}
        >
          {/* Tisch */}
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: tableDiameter, md: tableDiameterMd },
              height: { xs: tableDiameter, md: tableDiameterMd },
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'divider',
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'text.secondary',
            }}
          >
            Tisch {props.tableName}
          </Box>

          {/* Stühle */}
          {props.seats.map((s, idx) => {
            const mobilePos = chairsMobile[idx];
            const mdPos = chairsMd[idx];
            return (
              <Tooltip
                key={s.id}
                title={
                  <Box>
                    <Typography variant="caption">
                      <strong>Section:</strong> {s.section ?? '—'}
                    </Typography>
                    <br />
                    <Typography variant="caption">
                      <strong>Table:</strong> {s.table ?? '—'}
                    </Typography>
                    <br />
                    <Typography variant="caption">
                      <strong>Seat:</strong> {seatLabel(s)}
                    </Typography>
                    {s.note && (
                      <>
                        <br />
                        <Typography variant="caption">
                          <strong>Note:</strong> {s.note}
                        </Typography>
                      </>
                    )}
                  </Box>
                }
              >
                <Avatar
                  sx={{
                    position: 'absolute',
                    width: chairSize,
                    height: chairSize,
                    fontSize: 13,
                    fontWeight: 700,
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    left: {
                      xs: mobilePos.left - chairSize / 2,
                      md: mdPos.left - chairSize / 2,
                    },
                    top: {
                      xs: mobilePos.top - chairSize / 2,
                      md: mdPos.top - chairSize / 2,
                    },
                    border: '2px solid',
                    borderColor: 'background.paper',
                    boxShadow: 1,
                  }}
                >
                  {seatLabel(s)}
                </Avatar>
              </Tooltip>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

// ---------- Komponente ----------
export default function EventDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id ?? '';

  const [allow, setAllow] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Tabs: 0 = Layout, 1 = Liste
  const [tab, setTab] = React.useState<number>(0);

  // Pagination (nur Liste-Tab)
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
    table: '',
    number: '',
    note: '',
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
      } catch {
        // no-op
      }
    },
  });

  const [createSeat, { loading: creatingSeat }] = useMutation(CREATE_SEAT, {
    onError: (e) => setError(e.message),
    onCompleted: async () => {
      await refetchSeats();
      setSeatForm({ section: '', table: '', number: '', note: '' });
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
    try {
      const text = await file.text();
      const parsed = parseCSV(text, eventId);
      if (parsed.length === 0) {
        setError(
          'CSV leer oder Pflichtfelder fehlen. Erwartet: section,table,number[,note]',
        );
        return;
      }
      setSelectedFileName(file.name);
      setPendingSeats(parsed);
      setOpenImportPreview(true);
    } catch (err) {
      setError((err as Error).message);
    }
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
          table: seatForm.table || null,
          number: seatForm.number || null,
          note: seatForm.note || null,
        },
      },
    });
  };

  // --------- Abgeleitete Daten ----------
  const ev = data?.event;

  // Section -> Table -> Seats
  const grouped: SeatsBySection = React.useMemo(() => {
    const src = seatsData?.seatsByEvent ?? [];
    return src.reduce<SeatsBySection>((acc, s) => {
      const sectionKey = (s.section ?? '—').trim() || '—';
      const tableKey = (s.table ?? '—').trim() || '—';
      if (!acc[sectionKey]) acc[sectionKey] = {};
      if (!acc[sectionKey][tableKey]) acc[sectionKey][tableKey] = [];
      acc[sectionKey][tableKey].push(s);
      return acc;
    }, {});
  }, [seatsData]);

  const sectionKeysSorted: string[] = React.useMemo(() => {
    const keys = Object.keys(grouped);
    const sorted = keys
      .filter((k) => k !== '—')
      .sort((a, b) => a.localeCompare(b, 'de'));
    if (keys.includes('—')) sorted.push('—');
    return sorted;
  }, [grouped]);

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
                  href={`/admin/event/${eventId}/invite`}
                  variant="contained"
                  color="primary"
                  startIcon={<GroupAddIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Gäste einladen
                </Button>

                <Button
                  component={Link}
                  href={`/admin/event/${eventId}/invitations`}
                  variant="outlined"
                  startIcon={<BallotIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Einladungen
                </Button>

                <Button
                  component={Link}
                  href={`/admin/event/${eventId}/tickets`}
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  Tickets
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
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  label="Section (Bereich/Reihe)"
                  value={seatForm.section ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, section: e.target.value }))
                  }
                  fullWidth
                  inputMode="text"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  label="Table (Tisch)"
                  value={seatForm.table ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, table: e.target.value }))
                  }
                  fullWidth
                  inputMode="text"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  label="Number (Sitz)"
                  value={seatForm.number ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeatForm((s) => ({ ...s, number: e.target.value }))
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

      {/* Seats importieren */}
      <Card variant="outlined">
        <CardHeader
          title="Seats importieren"
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
        />
        {importing && <LinearProgress />}
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            CSV mit Header <code>section,table,number[,note]</code> auswählen.
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

      {/* Tabs: Layout & Liste */}
      <Card variant="outlined">
        <CardHeader
          title="Sitzplätze"
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Tabs
            value={tab}
            onChange={(_e, v: number) => setTab(v)}
            variant="fullWidth"
            aria-label="Seats Tabs"
          >
            <Tab id="tab-0" label="Layout" />
            <Tab id="tab-1" label="Liste" />
          </Tabs>

          {/* Tab 0: Layout (Section -> Tables) */}
          <TabPanel value={tab} index={0}>
            {seatsLoading && <LinearProgress />}
            {!seatsLoading && sectionKeysSorted.length === 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Noch keine Seats vorhanden.
              </Alert>
            )}

            <Stack spacing={2} sx={{ mt: 1 }}>
              {sectionKeysSorted.map((sectionKey) => {
                const tables = grouped[sectionKey];
                const tableKeys = Object.keys(tables).sort((a, b) =>
                  a.localeCompare(b, 'de'),
                );

                return (
                  <Card
                    key={sectionKey}
                    variant="outlined"
                    sx={{ borderRadius: 3 }}
                  >
                    <CardHeader
                      title={`Section ${sectionKey}`}
                      titleTypographyProps={{
                        variant: 'subtitle1',
                        sx: { fontWeight: 800 },
                      }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Grid container spacing={1}>
                        {tableKeys.map((tableKey) => (
                          <Grid
                            key={tableKey}
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={3}
                          >
                            <TableCluster
                              sectionName={sectionKey}
                              tableName={tableKey}
                              seats={tables[tableKey]}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </TabPanel>

          {/* Tab 1: Liste */}
          <TabPanel value={tab} index={1}>
            {seatsLoading && <LinearProgress />}
            {!seatsLoading && (seatsData?.seatsByEvent.length ?? 0) === 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Noch keine Seats vorhanden.
              </Alert>
            )}
            <Stack spacing={1} sx={{ mt: 1 }}>
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
                        Section {s.section || '—'} • Tisch {s.table || '—'} •
                        Sitz {seatLabel(s)}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                    </Stack>
                    {s.note && (
                      <Typography variant="body2" color="text.secondary">
                        {s.note}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Mehr laden */}
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
          </TabPanel>
        </CardContent>
      </Card>

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
              <Card
                key={`preview-${i}`}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>
                    Section {s.section || '—'} • Tisch {s.table || '—'} • Sitz{' '}
                    {s.number || '—'}
                  </Typography>
                  {s.note && (
                    <Typography variant="body2" color="text.secondary">
                      {s.note}
                    </Typography>
                  )}
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

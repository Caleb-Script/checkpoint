// /web/src/app/events/[id]/invite/page.tsx
'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddIcon from '@mui/icons-material/PersonAddAlt1';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { EVENT_BY_ID, EVENT_SEATS } from '../../../../graphql/event/query';
import {
  CREATE_INVITATION,
  CREATE_PLUS_ONES_INVITATION,
  UPDATE_INVITATION,
} from '../../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../../graphql/invitation/query';
import { CREATE_TICKET } from '../../../../graphql/ticket/mutation';
import { GET_TICKETS } from '../../../../graphql/ticket/query';
import {
  copyToClipboard,
  rsvpLinkForInvitationId,
  tryNativeShare,
  whatsappShareUrl,
} from '../../../../lib/link';
import {
  Invitation,
  InvitationsQueryResult,
} from '../../../../types/invitation/invitation.type';

type CsvRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  maxInvitees?: number;
};
type SeatRow = {
  id: string;
  eventId: string;
  section?: string | null;
  row?: string | null;
  number?: string | null;
  note?: string | null;
  table?: string | null;
};

export default function EventAdminInvitePage() {
  const { id: eventId } = useParams<{ id: string }>();

  const {
    data: evData,
    loading: evLoading,
    error: evError,
    refetch: refetchEvent,
  } = useQuery(EVENT_BY_ID, {
    variables: { id: eventId },
    fetchPolicy: 'cache-and-network',
  });
  const ev = evData?.event;

  const {
    data: invData,
    loading: invLoading,
    error: invError,
    refetch: refetchInvs,
  } = useQuery<InvitationsQueryResult>(INVITATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const allInvs = invData?.invitations ?? [];
  const eventInvs = allInvs.filter((i) => i.eventId === eventId);

  const [createInvitation, { loading: creating }] = useMutation(
    CREATE_INVITATION,
    {
      update(cache, { data }) {
        const created = data?.createInvitation;
        if (!created) return;
        try {
          const existing = cache.readQuery<InvitationsQueryResult>({
            query: INVITATIONS,
          });
          if (existing?.invitations) {
            cache.writeQuery({
              query: INVITATIONS,
              data: { invitations: [created, ...existing.invitations] },
            });
          }
        } catch {}
      },
    },
  );

  const [updateInvitation, { loading: updating }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: plusOneCreating }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );
  const [createTicket, { loading: creatingTicket }] =
    useMutation(CREATE_TICKET);

  const [loadTickets, { data: ticketsData }] = useLazyQuery(GET_TICKETS, {
    fetchPolicy: 'cache-first',
  });
  const [loadSeats, { data: seatsData, loading: seatsLoading }] = useLazyQuery(
    EVENT_SEATS,
    { fetchPolicy: 'cache-first' },
  );

  const [defaultMaxInvitees, setDefaultMaxInvitees] = React.useState<number>(0);
  const [csvText, setCsvText] = React.useState<string>('');
  const [singleMaxInvitees, setSingleMaxInvitees] = React.useState<number>(0);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [recentLinks, setRecentLinks] = React.useState<string[]>([]);

  // Dialog Sitzzuweisung
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<Invitation | null>(null);
  const [seatId, setSeatId] = React.useState<string>('');
  const [filter, setFilter] = React.useState('');
  const [onlyFree, setOnlyFree] = React.useState(true);

  function toLocal(dt?: string) {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  }

  function seatsForEvent(): SeatRow[] {
    const all = seatsData?.eventSeats ?? [];
    if (!all.length) return [];
    const taken = new Set(
      (ticketsData?.getTickets ?? [])
        .filter((t: any) => t.eventId === eventId && t.seatId)
        .map((t: any) => t.seatId),
    );
    let list = all as SeatRow[];
    if (onlyFree) list = list.filter((s) => !taken.has(s.id));
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter((s) =>
        [s.section, s.row, s.number, s.table, s.note]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(f)),
      );
    }
    return list;
  }

  async function openAssign(inv: Invitation) {
    setCurrent(inv);
    setSeatId('');
    setFilter('');
    setOnlyFree(true);
    await Promise.all([
      loadTickets(),
      loadSeats({
        variables: { eventId, offset: 0, limit: 1000, filter: null },
      }),
    ]);
    setOpen(true);
  }

  async function approveWithSeat() {
    if (!current) return;
    await updateInvitation({ variables: { id: current.id, approved: true } });
    try {
      await createTicket({
        variables: {
          eventId,
          invitationId: current.id,
          seatId: seatId ? seatId : null,
        },
      });
    } catch {}
    setOpen(false);
    await refetchInvs();
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setCsvText(t);
  }

  function parseCsv(text: string): CsvRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const sep = (s: string) =>
      s.includes(';') && !s.includes(',') ? ';' : ',';
    const sepa = sep(lines[0]);
    const header = lines[0]
      .toLowerCase()
      .split(sepa)
      .map((h) => h.trim());
    const looksHeader = [
      'firstname',
      'lastname',
      'email',
      'phone',
      'maxinvitees',
    ].some((k) => header.includes(k));
    const out: CsvRow[] = [];
    if (looksHeader) {
      const idx = (name: string) => header.indexOf(name);
      for (let i = 1; i < lines.length; i++) {
        const p = lines[i].split(sepa).map((x) => x.trim());
        out.push({
          firstName: idx('firstname') >= 0 ? p[idx('firstname')] : undefined,
          lastName: idx('lastname') >= 0 ? p[idx('lastname')] : undefined,
          email: idx('email') >= 0 ? p[idx('email')] : undefined,
          phone: idx('phone') >= 0 ? p[idx('phone')] : undefined,
          maxInvitees:
            idx('maxinvitees') >= 0
              ? Number(p[idx('maxinvitees')] || 0)
              : undefined,
        });
      }
    } else {
      for (const line of lines) {
        const p = line.split(sepa).map((x) => x.trim());
        out.push({
          firstName: p[0],
          lastName: p[1],
          email: p[2],
          phone: p[3],
          maxInvitees: p[4] ? Number(p[4]) : undefined,
        });
      }
    }
    return out;
  }

  async function createManyFromCsv() {
    setErr(null);
    setMsg(null);
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      setErr(
        'CSV/Text leer oder nicht erkannt. Erwarte Spalten: firstName,lastName,email,phone[,maxInvitees]',
      );
      return;
    }
    const links: string[] = [];
    let ok = 0,
      fail = 0;
    for (const r of rows) {
      try {
        const res = await createInvitation({
          variables: {
            eventId,
            maxInvitees: Number.isFinite(r.maxInvitees as number)
              ? Number(r.maxInvitees)
              : defaultMaxInvitees,
          },
        });
        const id = res.data?.createInvitation?.id as string | undefined;
        if (id) links.push(rsvpLinkForInvitationId(id));
        ok++;
      } catch {
        fail++;
      }
    }
    await refetchInvs();
    setRecentLinks(links);
    setMsg(
      `Fertig: ${ok} Einladungen erstellt${fail ? `, ${fail} Fehler` : ''}.`,
    );
  }

  async function createSingle() {
    setErr(null);
    setMsg(null);
    const res = await createInvitation({
      variables: { eventId, maxInvitees: Number(singleMaxInvitees || 0) },
    });
    await refetchInvs();
    const id = res.data?.createInvitation?.id as string | undefined;
    if (id) setRecentLinks([rsvpLinkForInvitationId(id)]);
    setMsg('Einladung erstellt.');
    setSingleMaxInvitees(0);
  }

  async function rsvpYes(id: string) {
    setErr(null);
    await updateInvitation({ variables: { id, rsvpChoice: 'YES' } });
    await refetchInvs();
  }
  async function rsvpNo(id: string) {
    setErr(null);
    await updateInvitation({ variables: { id, rsvpChoice: 'NO' } });
    await refetchInvs();
  }
  async function addPlusOne(parentId: string, count = 1) {
    setErr(null);
    for (let i = 0; i < count; i++) {
      await createPlusOne({
        variables: { eventId, invitedByInvitationId: parentId },
      });
    }
    await refetchInvs();
  }

  async function copy(url: string) {
    const ok = await copyToClipboard(url);
    setMsg(ok ? 'Link kopiert.' : 'Kopieren nicht möglich.');
  }

  async function share(inv: Invitation) {
    const url = rsvpLinkForInvitationId(inv.id);
    const title = `Einladung ${ev?.name ?? ''}`.trim();
    const text = `Bitte bestätige deine Teilnahme${ev ? `:\n${ev.name}\n${toLocal(ev.startsAt)} – ${toLocal(ev.endsAt)}` : ''}`;
    const usedNative = await tryNativeShare(title, text, url);
    if (!usedNative) {
      window.open(
        whatsappShareUrl(`${text}\n\nRSVP-Link: ${url}`),
        '_blank',
        'noopener,noreferrer',
      );
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Gäste einladen (Admin)
      </Typography>

      <Card sx={{ mb: 2 }}>
        {evLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}
        {!evLoading && evError && (
          <Alert severity="error" sx={{ m: 2 }}>
            {String(evError)}
          </Alert>
        )}
        {!evLoading && ev && (
          <>
            <CardHeader
              title={`Event „${ev.name}“`}
              subheader={`${toLocal(ev.startsAt)} – ${toLocal(ev.endsAt)}`}
              action={
                <IconButton
                  onClick={() => {
                    refetchEvent();
                    refetchInvs();
                  }}
                  title="Aktualisieren"
                >
                  <RefreshIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`ID: ${ev.id}`} />
                {typeof ev.maxSeats === 'number' && (
                  <Chip size="small" label={`Max Seats: ${ev.maxSeats}`} />
                )}
                <Chip size="small" label={`Rotation: ${ev.rotateSeconds}s`} />
                <Chip
                  size="small"
                  label={`Re-Entry: ${ev.allowReEntry ? 'Ja' : 'Nein'}`}
                />
              </Stack>
            </CardContent>
          </>
        )}
      </Card>

      {(err || invError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? String(invError)}
        </Alert>
      )}

      {recentLinks.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <div>
              <strong>RSVP-Links</strong> (zuletzt erstellt):
            </div>
            {recentLinks.map((l, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  value={l}
                  size="small"
                  fullWidth
                  inputProps={{ readOnly: true }}
                />
                <Tooltip title="Link kopieren">
                  <IconButton onClick={() => copy(l)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="In WhatsApp teilen">
                  <IconButton
                    onClick={() =>
                      window.open(
                        whatsappShareUrl(l),
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Bulk-Create */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="Bulk-Einladungen erstellen"
          subheader="CSV/Text – optional mit Spalte maxInvitees. Der RSVP-Link wird aus der Invitation-ID gebaut."
        />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                label="Default maxInvitees"
                type="number"
                inputProps={{ min: 0 }}
                value={defaultMaxInvitees}
                onChange={(e) =>
                  setDefaultMaxInvitees(Number(e.target.value || 0))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm="auto">
              <Button component="label" variant="outlined">
                CSV-Datei wählen
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleCsvFile}
                />
              </Button>
            </Grid>
          </Grid>

          <TextField
            sx={{ mt: 2 }}
            label="CSV / Text"
            placeholder={`firstName,lastName,email,phone,maxInvitees\nAlex,Meyer,alex@example.com,0170...,2`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              disabled={creating}
              onClick={createManyFromCsv}
            >
              Einladungen erzeugen
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Single-Create */}
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Schnell: einzelne Einladung" />
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              label="maxInvitees"
              type="number"
              inputProps={{ min: 0 }}
              value={singleMaxInvitees}
              onChange={(e) =>
                setSingleMaxInvitees(Number(e.target.value || 0))
              }
              sx={{ maxWidth: 200 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={createSingle}
              disabled={creating}
            >
              Einladung erstellen
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Einladungen (Event) */}
      <Card>
        <CardHeader title="Einladungen dieses Events" />
        <CardContent>
          {invLoading && <Typography>Wird geladen…</Typography>}
          {!invLoading && eventInvs.length === 0 && (
            <Typography>Keine Einladungen vorhanden.</Typography>
          )}

          {eventInvs.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invitation ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>RSVP</TableCell>
                  <TableCell>maxInvitees</TableCell>
                  <TableCell>Approved</TableCell>
                  <TableCell>RSVP-Link</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventInvs.map((inv) => {
                  const url = rsvpLinkForInvitationId(inv.id);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.id}</TableCell>
                      <TableCell>{inv.status}</TableCell>
                      <TableCell>{inv.rsvpChoice ?? '—'}</TableCell>
                      <TableCell>{inv.maxInvitees}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={inv.approved ? 'Ja' : 'Nein'}
                          color={inv.approved ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell style={{ minWidth: 260 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            value={url}
                            size="small"
                            fullWidth
                            inputProps={{ readOnly: true }}
                          />
                          <Tooltip title="Kopieren">
                            <IconButton onClick={() => copy(url)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Teilen (System/WhatsApp)">
                            <IconButton onClick={() => share(inv)}>
                              <ShareIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <IconButton
                            title="Approven & Sitz zuweisen"
                            onClick={() => openAssign(inv)}
                            disabled={updating || creatingTicket}
                          >
                            <DoneAllIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            title="RSVP YES"
                            onClick={() => rsvpYes(inv.id)}
                            disabled={updating}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            title="RSVP NO"
                            onClick={() => rsvpNo(inv.id)}
                            disabled={updating}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <Divider orientation="vertical" flexItem />
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => addPlusOne(inv.id, 1)}
                            disabled={plusOneCreating}
                          >
                            Plus-One
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Sitzplatz zuweisen */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Ticket erzeugen & Sitz zuweisen</DialogTitle>
        <DialogContent dividers>
          {seatsLoading && <Typography>Seats werden geladen…</Typography>}
          {!seatsLoading && (
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={onlyFree}
                    onChange={(e) => setOnlyFree(e.target.checked)}
                  />
                }
                label="Nur freie Sitze anzeigen"
              />
              <TextField
                size="small"
                label="Filter (Section/Row/Number/Table/Note)"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel id="seat-select-label">Sitzplatz</InputLabel>
                <Select
                  labelId="seat-select-label"
                  label="Sitzplatz"
                  value={seatId}
                  onChange={(e) => setSeatId(String(e.target.value))}
                >
                  <MenuItem value="">
                    <em>Ohne Auswahl (Zufällig vom System)</em>
                  </MenuItem>
                  {seatsForEvent().map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {[
                        s.section && `Sec ${s.section}`,
                        s.row && `Row ${s.row}`,
                        s.number && `#${s.number}`,
                        s.table && `Table ${s.table}`,
                        s.note && `(${s.note})`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info">
                Nichts ausgewählt = Zufälliger Sitz (serverseitig). Später
                änderbar, sobald ein <i>updateTicket</i>-Resolver vorhanden ist.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button
            onClick={approveWithSeat}
            variant="contained"
            disabled={updating || creatingTicket}
          >
            Approven & Ticket anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

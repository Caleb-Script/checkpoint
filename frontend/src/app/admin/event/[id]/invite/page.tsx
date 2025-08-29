// /frontend/srv/app/event/[id]/invite/page.tsx
'use client';

import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import * as React from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/PersonAddAlt1';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { EVENT_BY_ID, EVENT_SEATS } from '../../../../../graphql/event/query';
import {
  CREATE_INVITATION,
  CREATE_PLUS_ONES_INVITATION,
  UPDATE_INVITATION,
} from '../../../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../../../graphql/invitation/query';
import { CREATE_TICKET } from '../../../../../graphql/ticket/mutation';
import { GET_TICKETS } from '../../../../../graphql/ticket/query';
import {
  copyToClipboard,
  rsvpLinkForInvitationId,
  tryNativeShare,
  whatsappShareUrl,
} from '../../../../../lib/link';
import type {
  Invitation,
  InvitationsQueryResult,
} from '../../../../../types/invitation/invitation.type';

// ---------- Zusätzliche, schlanke Typen für diese Seite ----------
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

type TicketRow = {
  id: string;
  eventId: string;
  seatId?: string | null;
};

// ---------- Utilities ----------
function displayName(
  inv: Partial<Invitation> & {
    firstName?: string | null;
    lastName?: string | null;
  },
): string {
  const fn = (inv.firstName ?? '').trim();
  const ln = (inv.lastName ?? '').trim();
  const name = [fn, ln].filter(Boolean).join(' ').trim();
  return name || 'N/A';
}
function initialsOf(name: string): string {
  const safe = name && name !== 'N/A' ? name : 'NA';
  return safe
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

const tz = 'Europe/Berlin';
function toLocal(dt?: string): string {
  if (!dt) return '';
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

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const resolveSep = (s: string) =>
    s.includes(';') && !s.includes(',') ? ';' : ',';
  const sepa = resolveSep(lines[0]);

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

// ---------- Komponente ----------
export default function EventAdminInvitePage() {
  const { id: eventId } = useParams<{ id: string }>();

  // Event Basisdaten
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

  // Alle Einladungen (wir filtern clientseitig auf dieses Event)
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

  // Mutations
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
            cache.writeQuery<InvitationsQueryResult>({
              query: INVITATIONS,
              data: { invitations: [created, ...existing.invitations] },
            });
          }
        } catch {
          // Liste evtl. noch nicht im Cache
        }
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

  // Lazy Queries (Seats, Tickets)
  const [loadTickets, { data: ticketsData }] = useLazyQuery<{
    getTickets: TicketRow[];
  }>(GET_TICKETS, { fetchPolicy: 'cache-first' });
  const [loadSeats, { data: seatsData, loading: seatsLoading }] = useLazyQuery<{
    seatsByEvent: SeatRow[];
    seatsByEventCount: number;
  }>(EVENT_SEATS, { fetchPolicy: 'cache-first' });

  // UI-State
  const [defaultMaxInvitees, setDefaultMaxInvitees] = React.useState<number>(0);
  const [singleMaxInvitees, setSingleMaxInvitees] = React.useState<number>(0);
  const [singleFirstName, setSingleFirstName] = React.useState<string>('');
  const [singleLastName, setSingleLastName] = React.useState<string>('');

  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [recentLinks, setRecentLinks] = React.useState<string[]>([]);

  // CSV Import (mobil: nur Datei-Picker + kompakte Preview)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [pendingRows, setPendingRows] = React.useState<CsvRow[]>([]);
  const [openImportPreview, setOpenImportPreview] =
    React.useState<boolean>(false);

  // Dialog Sitzzuweisung
  const [openAssignDlg, setOpenAssignDlg] = React.useState(false);
  const [currentInv, setCurrentInv] = React.useState<Invitation | null>(null);
  const [seatId, setSeatId] = React.useState<string>('');
  const [filter, setFilter] = React.useState('');
  const [onlyFree, setOnlyFree] = React.useState(true);

  // List UX controls
  const [search, setSearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<
    'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED'
  >('ALL');
  const [rsvpFilter, setRsvpFilter] = React.useState<
    'ALL' | 'YES' | 'NO' | 'NONE'
  >('ALL');
  const [sortBy, setSortBy] = React.useState<
    'updatedAt' | 'createdAt' | 'name'
  >('updatedAt');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // ---------- Helpers für Sitzliste ----------
  function seatsForEvent(): SeatRow[] {
    const all = seatsData?.seatsByEvent ?? [];
    if (!all.length) return [];
    const taken = new Set(
      (ticketsData?.getTickets ?? [])
        .filter((t) => t.eventId === eventId && t.seatId)
        .map((t) => t.seatId as string),
    );

    let list = all.slice();
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

  // ---------- Actions ----------
  async function openAssign(inv: Invitation) {
    setCurrentInv(inv);
    setSeatId('');
    setFilter('');
    setOnlyFree(true);
    await Promise.all([
      loadTickets(),
      loadSeats({
        variables: { eventId, offset: 0, limit: 1000, filter: null },
      }),
    ]);
    setOpenAssignDlg(true);
  }

  async function approveWithSeat() {
    if (!currentInv) return;
    await updateInvitation({
      variables: { id: currentInv.id, approved: true },
    });
    try {
      await createTicket({
        variables: {
          eventId,
          invitationId: currentInv.id,
          seatId: seatId ? seatId : null,
        },
      });
    } catch {
      // Ticket konnte evtl. schon existieren
    }
    setOpenAssignDlg(false);
    await refetchInvs();
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
    const title = `Einladung ${((ev?.name ?? '') as string).trim()}`;
    const text = ev
      ? `Bitte bestätige deine Teilnahme\n${ev.name}\n${toLocal(ev.startsAt)} – ${toLocal(
          ev.endsAt,
        )}`
      : 'Bitte bestätige deine Teilnahme';
    const usedNative = await tryNativeShare(title, text, url);
    if (!usedNative) {
      window.open(
        whatsappShareUrl(`${text}\n\nRSVP-Link: ${url}`),
        '_blank',
        'noopener,noreferrer',
      );
    }
  }

  // CSV: Datei wählen → parsen → Preview anzeigen
  async function handleCsvPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    const rows = parseCsv(t);
    if (rows.length === 0) {
      setErr(
        'CSV nicht erkannt. Erwartet: firstName,lastName,email,phone[,maxInvitees]',
      );
      return;
    }
    setSelectedFileName(f.name);
    setPendingRows(rows);
    setOpenImportPreview(true);
  }

  async function createManyFromPending() {
    setErr(null);
    setMsg(null);
    const links: string[] = [];
    let ok = 0;
    let fail = 0;

    for (const r of pendingRows) {
      try {
        const res = await createInvitation({
          variables: {
            eventId,
            maxInvitees: Number.isFinite(r.maxInvitees as number)
              ? Number(r.maxInvitees)
              : defaultMaxInvitees,
            firstName: r.firstName?.trim() || undefined,
            lastName: r.lastName?.trim() || undefined,
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
    setOpenImportPreview(false);
    setPendingRows([]);
    setSelectedFileName('');
  }

  async function createSingle() {
    setErr(null);
    setMsg(null);

    const variables: {
      eventId: string;
      maxInvitees: number;
      firstName?: string;
      lastName?: string;
    } = {
      eventId,
      maxInvitees: Number(singleMaxInvitees || 0),
    };

    if (singleFirstName.trim()) variables.firstName = singleFirstName.trim();
    if (singleLastName.trim()) variables.lastName = singleLastName.trim();

    const res = await createInvitation({ variables });
    await refetchInvs();

    const id = res.data?.createInvitation?.id as string | undefined;
    if (id) setRecentLinks([rsvpLinkForInvitationId(id)]);
    setMsg('Einladung erstellt.');

    setSingleFirstName('');
    setSingleLastName('');
    setSingleMaxInvitees(0);
  }

  // ---------- UI ----------
  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
      {/* Kopfbereich / Event Info */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 800 } }}
          title="Gäste einladen"
          action={
            <Tooltip title="Aktualisieren">
              <span>
                <IconButton
                  onClick={() => {
                    refetchEvent();
                    refetchInvs();
                  }}
                  disabled={evLoading || invLoading}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />

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
          <CardContent>
            <Stack spacing={0.75}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {ev.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {toLocal(ev.startsAt)} – {toLocal(ev.endsAt)}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ mt: 0.5 }}
              >
                <Chip
                  size="small"
                  icon={<QrCode2Icon />}
                  label={`Rotation: ${ev.rotateSeconds}s`}
                />
                <Chip
                  size="small"
                  color={ev.allowReEntry ? 'success' : 'default'}
                  label={`Re-Entry: ${ev.allowReEntry ? 'Ja' : 'Nein'}`}
                />
                {typeof ev.maxSeats === 'number' && (
                  <>
                    <Chip
                      size="small"
                      icon={<GroupsIcon />}
                      label={`Max Seats: ${ev.maxSeats}`}
                    />

                    <Chip
                      size="small"
                      icon={<GroupsIcon />}
                      label={`Seats left: ${ev.maxSeats - Number(seatsForEvent())}`}
                    />
                  </>
                )}
              </Stack>
            </Stack>
          </CardContent>
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
            <Typography fontWeight={700}>
              RSVP-Links (zuletzt erstellt)
            </Typography>
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

      {/* Bulk-Create (MOBILE: nur Datei wählen + Preview) */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
          title="Bulk-Einladungen"
          subheader="CSV mit optionaler Spalte maxInvitees wählen."
        />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                label="Default maxInvitees"
                type="number"
                inputProps={{ min: 0 }}
                value={defaultMaxInvitees}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDefaultMaxInvitees(Number(e.target.value || 0))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={'auto'}>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleCsvPick}
              />
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderRadius: 2 }}
              >
                {selectedFileName ? 'Andere CSV wählen' : 'CSV wählen'}
              </Button>
              {selectedFileName && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.75 }}
                >
                  Gewählt: {selectedFileName}
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Single-Create */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 700 } }}
          title="Einladung (einzeln)"
        />
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ flexWrap: 'wrap' }}
          >
            <TextField
              label="Vorname"
              value={singleFirstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSingleFirstName(e.target.value)
              }
              fullWidth
              sx={{ maxWidth: 240 }}
            />
            <TextField
              label="Nachname"
              value={singleLastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSingleLastName(e.target.value)
              }
              fullWidth
              sx={{ maxWidth: 240 }}
            />
            <TextField
              label="maxInvitees"
              type="number"
              inputProps={{ min: 0 }}
              value={singleMaxInvitees}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSingleMaxInvitees(Number(e.target.value || 0))
              }
              fullWidth
              sx={{ maxWidth: 240 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={createSingle}
              disabled={creating}
              sx={{ borderRadius: 2 }}
            >
              Einladung erstellen
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog: Sitzplatz zuweisen */}
      <Dialog
        open={openAssignDlg}
        onClose={() => setOpenAssignDlg(false)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setOnlyFree(e.target.checked)
                    }
                  />
                }
                label="Nur freie Sitze anzeigen"
              />
              <TextField
                size="small"
                label="Filter (Section/Row/Number/Table/Note)"
                value={filter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilter(e.target.value)
                }
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
                änderbar, sobald ein
                <i> updateTicket </i> -Resolver vorhanden ist.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDlg(false)}>Abbrechen</Button>
          <Button
            onClick={approveWithSeat}
            variant="contained"
            disabled={updating || creatingTicket}
          >
            Approven & Ticket anlegen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import-Preview Dialog (mobil-kompakt) */}
      <Dialog
        open={openImportPreview}
        onClose={() => setOpenImportPreview(false)}
        fullWidth
      >
        <DialogTitle>Bulk-Import prüfen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Datei: <strong>{selectedFileName || '—'}</strong>
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {pendingRows.length} Eintrag/Einträge erkannt. Mit „Einladungen
            erzeugen“ bestätigst du den Import.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Beispiele (erste 3):
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {pendingRows.slice(0, 3).map((r, i) => (
              <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>
                    {(r.firstName || '') + ' ' + (r.lastName || '')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.email || '—'} {r.phone ? `• ${r.phone}` : ''}{' '}
                    {typeof r.maxInvitees === 'number'
                      ? `• maxInvitees ${r.maxInvitees}`
                      : ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportPreview(false)}>Abbrechen</Button>
          <Button
            onClick={createManyFromPending}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={pendingRows.length === 0 || creating}
          >
            Einladungen erzeugen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// (Optional) Lokale Mutation, falls du sie direkt hier verwenden möchtest
export const CREATE_INVITATION_LOCAL = gql /* GraphQL */ `
  mutation CreateInvitation(
    $eventId: ID!
    $maxInvitees: Int!
    $firstName: String
    $lastName: String
  ) {
    createInvitation(
      input: {
        eventId: $eventId
        maxInvitees: $maxInvitees
        firstName: $firstName
        lastName: $lastName
      }
    ) {
      firstName
      lastName
      approved
      approvedById
      approvedAt
      eventId
      guestProfileId
      id
      invitedByInvitationId
      invitedById
      plusOnes
      maxInvitees
      rsvpChoice
      rsvpAt
      status
      createdAt
      updatedAt
    }
  }
`;

// /frontend/src/app/admin/event/[id]/invitations/page.tsx

//TODO 
// massen Approve
// kein hook in map 
// Create invitation button zu /admin/event/[id]/invite
// Badges für „Plus-Ones vorhanden“ & „Ticket existiert“?
'use client';

import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/PersonAddAlt1';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import ShareIcon from '@mui/icons-material/Share';
import SortIcon from '@mui/icons-material/Sort';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { EVENT_BY_ID, EVENT_SEATS } from '../../../../../graphql/event/query';
import { UPDATE_INVITATION, CREATE_PLUS_ONES_INVITATION } from '../../../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../../../graphql/invitation/query';
import { CREATE_TICKET } from '../../../../../graphql/ticket/mutation';
import { GET_TICKETS } from '../../../../../graphql/ticket/query';
import { copyToClipboard, rsvpLinkForInvitationId, tryNativeShare, whatsappShareUrl } from '../../../../../lib/link';
import { Invitation, InvitationsQueryResult } from '../../../../../types/invitation/invitation.type';

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
export default function InvitationsPage() {
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
  const events = evData?.event;


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
    const title = `Einladung ${((events?.name ?? '') as string).trim()}`;
    const text = events
      ? `Bitte bestätige deine Teilnahme\n${events.name}\n${toLocal(events.startsAt)} – ${toLocal(
          events.endsAt,
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

  return (
    <Stack spacing={1.25} sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Einladungen zu {events?.name}
      </Typography>

      {/* Controls: Suche, Filter, Sortierung */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            useFlexGap
            flexWrap="wrap"
          >
            <TextField
              placeholder="Suche nach Name/ID"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="ALL">Alle</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                <MenuItem value="DECLINED">Declined</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>RSVP</InputLabel>
              <Select
                label="RSVP"
                value={rsvpFilter}
                onChange={(e) => setRsvpFilter(e.target.value as any)}
              >
                <MenuItem value="ALL">Alle</MenuItem>
                <MenuItem value="YES">Yes</MenuItem>
                <MenuItem value="NO">No</MenuItem>
                <MenuItem value="NONE">—</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(_, v) => v && setSortBy(v)}
              size="small"
              aria-label="Sortierung"
            >
              <ToggleButton value="updatedAt" aria-label="Neueste zuerst">
                <SortIcon sx={{ mr: 0.5 }} fontSize="small" /> Aktualisiert
              </ToggleButton>
              <ToggleButton value="createdAt" aria-label="Erstellt">
                Erstellt
              </ToggleButton>
              <ToggleButton value="name" aria-label="Name">
                Name
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      {invLoading && (
        <Card variant="outlined">
          <CardContent>
            <Typography>Wird geladen…</Typography>
          </CardContent>
        </Card>
      )}
      {!invLoading && eventInvs.length === 0 && (
        <Alert severity="info">Keine Einladungen vorhanden.</Alert>
      )}

      {/* Gefilterte/Sortierte Liste */}
      {(() => {
        const term = search.trim().toLowerCase();
        let list = eventInvs.slice();
        if (term) {
          list = list.filter((inv) => {
            const name = displayName(inv).toLowerCase();
            return name.includes(term) || inv.id.toLowerCase().includes(term);
          });
        }
        if (statusFilter !== 'ALL')
          list = list.filter((i) => i.status === statusFilter);
        if (rsvpFilter !== 'ALL') {
          if (rsvpFilter === 'NONE') list = list.filter((i) => !i.rsvpChoice);
          else list = list.filter((i) => i.rsvpChoice === rsvpFilter);
        }
        list.sort((a, b) => {
          if (sortBy === 'name') {
            return displayName(a).localeCompare(displayName(b), 'de');
          }
          const av = (a as any)[sortBy] as string | undefined;
          const bv = (b as any)[sortBy] as string | undefined;
          return (bv ? Date.parse(bv) : 0) - (av ? Date.parse(av) : 0);
        });

        return list.map((inv) => {
          const url = rsvpLinkForInvitationId(inv.id);
          const name = displayName(inv);
          const initials = initialsOf(name);
          const rsvpColor =
            inv.rsvpChoice === 'YES'
              ? 'success'
              : inv.rsvpChoice === 'NO'
                ? 'error'
                : 'default';
          const statusColor =
            inv.status === 'ACCEPTED'
              ? 'success'
              : inv.status === 'DECLINED'
                ? 'error'
                : 'default';
          const expanded = expandedId === inv.id;

          return (
            <Card
              key={inv.id}
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden' }}
            >
              {/* Card Header */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1.25,
                  py: 1,
                  background:
                    'linear-gradient(90deg, rgba(25,118,210,0.08), rgba(25,118,210,0))',
                }}
                onClick={() => setExpandedId(expanded ? null : inv.id)}
                role="button"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {initials || 'NA'}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {inv.id.slice(0, 8)}…
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`RSVP: ${inv.rsvpChoice ?? '—'}`}
                  color={rsvpColor as any}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={inv.status}
                  color={statusColor as any}
                  variant="outlined"
                  sx={{ ml: 0.5 }}
                />
                <IconButton size="small" aria-label="expand">
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      transform: expanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform .2s',
                    }}
                  />
                </IconButton>
              </Stack>

              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider />
                <CardContent sx={{ pt: 1.25 }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Chip
                        size="small"
                        label={`maxInvitees: ${inv.maxInvitees}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={inv.approved ? 'Approved' : 'Unapproved'}
                        color={inv.approved ? 'success' : 'default'}
                        variant={inv.approved ? 'filled' : 'outlined'}
                      />
                    </Stack>
                    <TextField
                      value={url}
                      size="small"
                      fullWidth
                      inputProps={{ readOnly: true }}
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                      sx={{ pt: 0.5 }}
                    >
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
                      <Tooltip title="RSVP YES">
                        <span>
                          <IconButton
                            onClick={() => rsvpYes(inv.id)}
                            disabled={updating}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="RSVP NO">
                        <span>
                          <IconButton
                            onClick={() => rsvpNo(inv.id)}
                            disabled={updating}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Approven & Sitz zuweisen">
                        <span>
                          <IconButton
                            onClick={() => openAssign(inv)}
                            disabled={updating || creatingTicket}
                          >
                            <DoneAllIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addPlusOne(inv.id, 1)}
                        disabled={plusOneCreating}
                        sx={{ borderRadius: 2 }}
                      >
                        Plus-One
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          );
        });
      })()}
    </Stack>
  );
}


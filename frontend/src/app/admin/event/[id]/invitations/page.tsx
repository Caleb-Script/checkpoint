// /frontend/src/app/admin/event/[id]/invitations/page.tsx

// TODO erledigt:
// - massen Approve/Disapprove (Freigeben / Freigabe zurücknehmen)
// - kein hook in map
// - Create invitation button zu /admin/event/[id]/invite
// - Badges für „Plus-Ones vorhanden“ & „Ticket existiert“
// - Willst du zusätzlich eine „Alle gefilterten sofort freigeben & Tickets zufällig setzen“-Aktion? Dann baue ich dir einen separaten Bulk-Dialog mit optionalem „Nur freie Plätze“ + Zufallszuweisung pro Einladung.

'use client';

import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
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
import ShareIcon from '@mui/icons-material/Share';
import SortIcon from '@mui/icons-material/Sort';

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
import {
  APPROVE_INVITATION,
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
import {
  Invitation,
  InvitationsQueryResult,
} from '../../../../../types/invitation/invitation.type';
import { useDeviceHash } from '../../../../../hooks/useDeviceHash';

/* ---------- Zusätzliche Typen ---------- */
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
  // Viele Backends geben invitationId mit zurück – wenn nicht vorhanden, wird der Badge via Fallback gesetzt.
  invitationId?: string | null;
};

/* ---------- Utilities ---------- */
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

/* ---------- Komponente ---------- */
export default function InvitationsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  /* Eventdaten */
  const {
    data: evData,
    loading: evLoading,
    error: evError,
    refetch: refetchEvent,
  } = useQuery(EVENT_BY_ID, {
    variables: { id: eventId },
    fetchPolicy: 'cache-and-network',
  });
  const event = evData?.event;

  /* Einladungen */
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

  /* Mutations getrennt: */
  const [approveInvitation, { loading: approving }] =
    useMutation(APPROVE_INVITATION);
  const [updateInvitation, { loading: updating }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: plusOneCreating }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );
  const [createTicket, { loading: creatingTicket }] =
    useMutation(CREATE_TICKET);

  /* Lazy Queries (Seats, Tickets) */
  const [loadTickets, { data: ticketsData, refetch: refetchTickets }] =
    useLazyQuery<{ getTickets: TicketRow[] }>(GET_TICKETS, {
      fetchPolicy: 'cache-first',
    });
  const [loadSeats, { data: seatsData, loading: seatsLoading }] = useLazyQuery<{
    seatsByEvent: SeatRow[];
    seatsByEventCount: number;
  }>(EVENT_SEATS, { fetchPolicy: 'cache-first' });

  /* UI-State */
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Auswahl für Massenaktionen
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const allFilteredSelected = (ids: string[]) =>
    ids.length > 0 && ids.every((id) => selectedIds.has(id));

  // Fallback für „Ticket existiert“-Badge, wenn der Ticket-Query keine invitationId liefert
  const [createdTicketInvIds, setCreatedTicketInvIds] = React.useState<
    Set<string>
  >(new Set());

  // Tickets für Badges vorladen
  React.useEffect(() => {
    if (eventId) loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* Listen-UX */
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

  /* Helpers: Seats */
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

  /* Dialog Sitzzuweisung */
  const [openAssignDlg, setOpenAssignDlg] = React.useState(false);
  const [currentInv, setCurrentInv] = React.useState<Invitation | null>(null);
  const [seatId, setSeatId] = React.useState<string>('');
  const [filter, setFilter] = React.useState('');
  const [onlyFree, setOnlyFree] = React.useState(true);

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

  // Approve & sofort Ticket erzeugen (gastprofil nötig)
  async function approveWithSeat() {
    if (!currentInv) return;
    setErr(null);
    setMsg(null);

    // 1) Approven -> guestProfileId kommt im Response
    const res = await approveInvitation({
      variables: { id: currentInv.id, approved: true },
    });
    const approved = (res.data as any)?.approveInvitation as
      | Invitation
      | undefined;

    const guestProfileId =
      approved?.guestProfileId ?? currentInv.guestProfileId ?? null;

    if (!guestProfileId) {
      setErr('Gastprofil nicht vorhanden. Ticket kann nicht erstellt werden.');
      await refetchInvs();
      setOpenAssignDlg(false);
      return;
    }

    // 2) Ticket erzeugen (mit guestProfileId)
    try {
      const tRes = await createTicket({
        variables: {
          eventId,
          invitationId: currentInv.id,
          seatId: seatId ? seatId : null,
          guestProfileId,
        },
      });
      // Fallback-Badge setzen
      setCreatedTicketInvIds((prev) => new Set(prev).add(currentInv.id));
      if (tRes.errors?.length)
        throw new Error('Ticket-Erstellung fehlgeschlagen');
      setMsg('Freigegeben und Ticket erstellt.');
    } catch (e: any) {
      setErr(`Ticket konnte nicht erstellt werden: ${String(e.message || e)}`);
    }

    setOpenAssignDlg(false);
    await Promise.all([refetchInvs(), refetchTickets?.()]);
  }

  /* RSVP-Shortcuts */
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

  /* Plus-One */
  async function addPlusOne(parentId: string, count = 1) {
    setErr(null);
    for (let i = 0; i < count; i++) {
      await createPlusOne({
        variables: { eventId, invitedByInvitationId: parentId },
      });
    }
    await refetchInvs();
  }

  /* Share/Copy */
  async function copy(url: string) {
    const ok = await copyToClipboard(url);
    setMsg(ok ? 'Link kopiert.' : 'Kopieren nicht möglich.');
  }
  async function share(inv: Invitation) {
    const url = rsvpLinkForInvitationId(inv.id);
    const title = `Einladung ${((event?.name ?? '') as string).trim()}`;
    const text = event
      ? `Bitte bestätige deine Teilnahme\n${event.name}\n${toLocal(event.startsAt)} – ${toLocal(event.endsAt)}`
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

  /* Auswahl-Logik */
  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }
  function selectAll(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) ids.forEach((id) => n.add(id));
      else ids.forEach((id) => n.delete(id));
      return n;
    });
  }

  async function bulkApprove(ids: string[], approve: boolean) {
    setErr(null);
    setMsg(null);
    for (const id of ids) {
      try {
        await approveInvitation({ variables: { id, approved: approve } });
      } catch {
        // continue
      }
    }
    await Promise.all([refetchInvs(), refetchTickets?.()]);
    setMsg(
      approve
        ? `Freigegeben: ${ids.length}`
        : `Freigabe zurückgenommen: ${ids.length}`,
    );
    setSelectedIds(new Set());
  }

  /* ==== RENDER ==== */
  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      {/* Kopfbereich */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 800 } }}
          title="Einladungen verwalten"
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => router.push(`/admin/event/${eventId}/invite`)}
                startIcon={<AddIcon />}
                sx={{ borderRadius: 2 }}
              >
                Einladung erstellen
              </Button>
              <Tooltip title="Aktualisieren">
                <span>
                  <IconButton
                    onClick={() => {
                      refetchEvent();
                      refetchInvs();
                      refetchTickets?.();
                    }}
                    disabled={evLoading || invLoading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
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
        {!evLoading && event && (
          <CardContent>
            <Stack spacing={0.75}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {event.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {toLocal(event.startsAt)} – {toLocal(event.endsAt)}
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
                  label={`Rotation: ${event.rotateSeconds}s`}
                />
                <Chip
                  size="small"
                  color={event.allowReEntry ? 'success' : 'default'}
                  label={`Re-Entry: ${event.allowReEntry ? 'Ja' : 'Nein'}`}
                />
                {typeof event.maxSeats === 'number' && (
                  <Chip
                    size="small"
                    icon={<GroupsIcon />}
                    label={`Max Seats: ${event.maxSeats}`}
                  />
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
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {msg}
        </Alert>
      )}

      {/* Filter-/Sortierleiste + Massenaktionen */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 1.5 }}>
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
              onChange={(e) => setSearch(e.target.value)}
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

            {/* Massenaktionen */}
            {(() => {
              // dieselbe Filter-/Sortierlogik wie unten, aber nur IDs für "alle auswählen"
              const term = search.trim().toLowerCase();
              let ids = eventInvs.slice();
              if (term)
                ids = ids.filter(
                  (inv) =>
                    displayName(inv).toLowerCase().includes(term) ||
                    inv.id.toLowerCase().includes(term),
                );
              if (statusFilter !== 'ALL')
                ids = ids.filter((i) => i.status === statusFilter);
              if (rsvpFilter !== 'ALL')
                ids =
                  rsvpFilter === 'NONE'
                    ? ids.filter((i) => !i.rsvpChoice)
                    : ids.filter((i) => i.rsvpChoice === rsvpFilter);
              ids.sort((a, b) => {
                if (sortBy === 'name')
                  return displayName(a).localeCompare(displayName(b), 'de');
                const av = (a as any)[sortBy] as string | undefined;
                const bv = (b as any)[sortBy] as string | undefined;
                return (bv ? Date.parse(bv) : 0) - (av ? Date.parse(av) : 0);
              });
              const idList = ids.map((x) => x.id);
              const allSel = allFilteredSelected(idList);
              const selCount = Array.from(selectedIds).filter((id) =>
                idList.includes(id),
              ).length;

              return (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ ml: 'auto' }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSel}
                        onChange={(e) => selectAll(idList, e.target.checked)}
                      />
                    }
                    label="Alle auswählen"
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => bulkApprove(Array.from(selectedIds), true)}
                    disabled={approving || selCount === 0}
                    sx={{ borderRadius: 2 }}
                  >
                    Freigeben ({selCount})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => bulkApprove(Array.from(selectedIds), false)}
                    disabled={approving || selCount === 0}
                    sx={{ borderRadius: 2 }}
                  >
                    Freigabe zurücknehmen ({selCount})
                  </Button>
                </Stack>
              );
            })()}
          </Stack>
        </CardContent>
      </Card>

      {/* Liste */}
      <Stack spacing={1.25} sx={{ mb: 2 }}>
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

        {(() => {
          const term = search.trim().toLowerCase();
          let list = eventInvs.slice();
          if (term)
            list = list.filter(
              (inv) =>
                displayName(inv).toLowerCase().includes(term) ||
                inv.id.toLowerCase().includes(term),
            );
          if (statusFilter !== 'ALL')
            list = list.filter((i) => i.status === statusFilter);
          if (rsvpFilter !== 'ALL')
            list =
              rsvpFilter === 'NONE'
                ? list.filter((i) => !i.rsvpChoice)
                : list.filter((i) => i.rsvpChoice === rsvpFilter);
          list.sort((a, b) => {
            if (sortBy === 'name')
              return displayName(a).localeCompare(displayName(b), 'de');
            const av = (a as any)[sortBy] as string | undefined;
            const bv = (b as any)[sortBy] as string | undefined;
            return (bv ? Date.parse(bv) : 0) - (av ? Date.parse(av) : 0);
          });

          // Tickets-Mapping für Badge
          const invitationIdsWithTicket = new Set<string>(
            (ticketsData?.getTickets ?? [])
              .filter((t) => t.eventId === eventId && t.invitationId)
              .map((t) => String(t.invitationId)),
          );

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
            const hasPlusOnes = (inv.plusOnes?.length ?? 0) > 0;
            const hasTicket =
              invitationIdsWithTicket.has(inv.id) ||
              createdTicketInvIds.has(inv.id);

            return (
              <Card
                key={inv.id}
                variant="outlined"
                sx={{ borderRadius: 3, overflow: 'hidden' }}
              >
                {/* Header */}
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
                >
                  <Checkbox
                    checked={selectedIds.has(inv.id)}
                    onChange={(e) => toggleSelect(inv.id, e.target.checked)}
                    sx={{ mr: 0.5 }}
                  />
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {initials || 'NA'}
                  </Avatar>
                  <Box
                    sx={{ minWidth: 0, flex: 1 }}
                    onClick={() => setExpandedId(expanded ? null : inv.id)}
                    role="button"
                  >
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

                  {hasPlusOnes && (
                    <Chip
                      size="small"
                      label={`Plus-Ones: ${inv.plusOnes?.length ?? 0}`}
                      variant="outlined"
                    />
                  )}
                  {hasTicket && (
                    <Chip
                      size="small"
                      label="Ticket"
                      color="success"
                      variant="outlined"
                    />
                  )}

                  <Chip
                    size="small"
                    label={`RSVP: ${inv.rsvpChoice ?? '—'}`}
                    color={rsvpColor as any}
                    variant="outlined"
                    sx={{ ml: 0.5 }}
                  />
                  <Chip
                    size="small"
                    label={inv.status}
                    color={statusColor as any}
                    variant="outlined"
                    sx={{ ml: 0.5 }}
                  />

                  <IconButton
                    size="small"
                    aria-label="expand"
                    onClick={() => setExpandedId(expanded ? null : inv.id)}
                  >
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
                          label={
                            inv.approved ? 'Freigegeben' : 'Nicht freigegeben'
                          }
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

                        {/* Einzel-Aktionen: Freigeben / Freigabe zurücknehmen */}
                        {!inv.approved ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              approveInvitation({
                                variables: { id: inv.id, approved: true },
                              }).then(() => refetchInvs())
                            }
                            disabled={approving}
                            sx={{ borderRadius: 2 }}
                          >
                            Freigeben
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() =>
                              approveInvitation({
                                variables: { id: inv.id, approved: false },
                              }).then(() => refetchInvs())
                            }
                            disabled={approving}
                            sx={{ borderRadius: 2 }}
                          >
                            Freigabe zurücknehmen
                          </Button>
                        )}

                        <Tooltip title="Freigeben & Sitz zuweisen">
                          <span>
                            <IconButton
                              onClick={() => openAssign(inv)}
                              disabled={approving || creatingTicket}
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
          <Button onClick={() => setOpenAssignDlg(false)}>Abbrechen</Button>
          <Button
            onClick={approveWithSeat}
            variant="contained"
            disabled={approving || creatingTicket}
          >
            Freigeben & Ticket anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

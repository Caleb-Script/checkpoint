// /frontend/src/app/admin/event/[id]/tickets/page.tsx
'use client';

import { gql, useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
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
import { copyToClipboard } from '../../../../../lib/link';

// ---- Lokale GQL (falls nicht schon im Projekt vorhanden) ----
const GET_TICKETS_BY_EVENT = gql /* GraphQL */ `
  query GetTicketsByEvent($id: ID!) {
    getTicketsByEvent(id: $id) {
      id
      eventId
      invitationId
      guestProfileId
      seatId
      currentState
      deviceBoundKey
      revoked
      createdAt
      updatedAt
    }
  }
`;

const DELETE_TICKET = gql /* GraphQL */ `
  mutation DeleteTicket($id: ID!) {
    deleteTicket(id: $id) {
      id
    }
  }
`;

// ---- Typen (schlank) ----
type Ticket = {
  id: string;
  eventId: string;
  invitationId?: string | null;
  guestProfileId?: string | null;
  seatId?: string | null;
  currentState?: string | null;
  deviceBoundKey?: string | null;
  revoked?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SeatRow = {
  id: string;
  eventId: string;
  section?: string | null;
  row?: string | null;
  number?: string | null;
  table?: string | null;
  note?: string | null;
};

const tz = 'Europe/Berlin';
function toLocal(dt?: string | null): string {
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
function initialsOf(str?: string | null): string {
  const s = (str || 'Ticket').trim() || 'Ticket';
  return s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Benutzerfreundlicher Sitz-Titel.
 * Beispiele:
 *  - Tisch 8 – Platz 3
 *  - Sektion A, Reihe 4, Platz 12
 *  - Sektion B, Platz 7
 *  - Sitzplatz 12 (Fallback)
 */
function prettySeatTitle(s?: SeatRow | null): string {
  if (!s) return 'Ohne Sitz';
  const section = (s.section ?? '').toString().trim();
  const row = (s.row ?? '').toString().trim();
  const num = (s.number ?? '').toString().trim();
  const table = (s.table ?? '').toString().trim();

  if (table) {
    const parts = [`Tisch ${table}`];
    if (num) parts.push(`Platz ${num}`);
    return parts.join(' – ');
  }

  const parts: string[] = [];
  if (section) parts.push(`Sektion ${section}`);
  if (row) parts.push(`Reihe ${row}`);
  if (num) parts.push(`Platz ${num}`);
  if (parts.length) return parts.join(', ');

  if (num) return `Sitz ${num}`;
  return `Sitzplatz ${s.id.slice(0, 8)}…`;
}

/** Kompakte Detail-Zeile für Tooltip (für Kopfbereich und Detailfeld) */
function compactSeatDetail(s?: SeatRow | null): string {
  if (!s) return 'Kein Sitz zugewiesen';
  const items = [
    s.section ? `Sektion ${s.section}` : null,
    s.row ? `Reihe ${s.row}` : null,
    s.number ? `Platz ${s.number}` : null,
    s.table ? `Tisch ${s.table}` : null,
  ].filter(Boolean);
  return items.length ? items.join(' • ') : `ID: ${s.id}`;
}

export default function TicketsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  // Event
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

  // Seats (für Anzeige der Seat-Details)
  const { data: seatsData, loading: seatsLoading } = useQuery<{
    seatsByEvent: SeatRow[];
    seatsByEventCount: number;
  }>(EVENT_SEATS, {
    variables: { eventId, offset: 0, limit: 5000, filter: null },
    fetchPolicy: 'cache-first',
  });
  const seatMap = React.useMemo(() => {
    const map = new Map<string, SeatRow>();
    (seatsData?.seatsByEvent ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [seatsData]);

  // Tickets
  const {
    data: tkData,
    loading: tkLoading,
    error: tkError,
    refetch: refetchTickets,
  } = useQuery<{ getTicketsByEvent: Ticket[] }>(GET_TICKETS_BY_EVENT, {
    variables: { id: eventId },
    fetchPolicy: 'cache-and-network',
  });
  const tickets = tkData?.getTicketsByEvent ?? [];

  // Mutations
  const [deleteTicket, { loading: deleting }] = useMutation(DELETE_TICKET);

  // UI State
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState<'ALL' | string>('ALL');
  const [revokedFilter, setRevokedFilter] = React.useState<
    'ALL' | 'YES' | 'NO'
  >('ALL');
  const [sortBy, setSortBy] = React.useState<
    'updatedAt' | 'createdAt' | 'seat'
  >('updatedAt');

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Auswahl & Massenlöschung
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [confirmBulkOpen, setConfirmBulkOpen] = React.useState(false);

  const uniqueStates = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of tickets) {
      if (t.currentState) s.add(t.currentState);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  const ticketsCount = tickets.length;
  const seatsLeft =
    typeof event?.maxSeats === 'number'
      ? Math.max(0, (event.maxSeats as number) - ticketsCount)
      : null;

  // Helpers
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

  // Filter + Sort
  const filteredSorted = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tickets.slice();

    if (term) {
      list = list.filter((t) => {
        const hay = [
          t.id,
          t.invitationId,
          t.guestProfileId,
          t.seatId,
          t.deviceBoundKey,
          t.currentState,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      });
    }

    if (stateFilter !== 'ALL') {
      list = list.filter((t) => (t.currentState ?? '') === stateFilter);
    }

    if (revokedFilter !== 'ALL') {
      list = list.filter((t) => {
        const rev = Boolean(t.revoked);
        return revokedFilter === 'YES' ? rev : !rev;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'seat') {
        const aLabel = a.seatId
          ? prettySeatTitle(seatMap.get(a.seatId) ?? null)
          : '';
        const bLabel = b.seatId
          ? prettySeatTitle(seatMap.get(b.seatId) ?? null)
          : '';
        return aLabel.localeCompare(bLabel);
      }
      const av = (a as any)[sortBy] as string | undefined;
      const bv = (b as any)[sortBy] as string | undefined;
      return (bv ? Date.parse(bv) : 0) - (av ? Date.parse(av) : 0);
    });

    return list;
  }, [tickets, search, stateFilter, revokedFilter, sortBy, seatMap]);

  const filteredIds = React.useMemo(
    () => filteredSorted.map((t) => t.id),
    [filteredSorted],
  );
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const selectedCount = Array.from(selectedIds).filter((id) =>
    filteredIds.includes(id),
  ).length;

  // Actions
  async function onCopy(text: string, label?: string) {
    const ok = await copyToClipboard(text);
    setMsg(
      ok ? `${label ? label + ' ' : ''}kopiert.` : 'Kopieren nicht möglich.',
    );
  }

  async function onDeleteSingle(id: string) {
    setErr(null);
    setMsg(null);
    await deleteTicket({ variables: { id } });
    await refetchTickets();
    setMsg('Ticket gelöscht.');
  }

  async function onDeleteBulk() {
    setErr(null);
    setMsg(null);
    const ids = Array.from(selectedIds).filter((id) =>
      filteredIds.includes(id),
    );
    for (const id of ids) {
      try {
        await deleteTicket({ variables: { id } });
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    setConfirmBulkOpen(false);
    await refetchTickets();
    setMsg(`Tickets gelöscht: ${ids.length}`);
  }

  return (
    <Box sx={{ p: 2, maxWidth: 960, mx: 'auto' }}>
      {/* Kopfbereich */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          titleTypographyProps={{ variant: 'h6', sx: { fontWeight: 800 } }}
          title="Tickets verwalten"
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() =>
                  router.push(`/admin/event/${eventId}/invitations`)
                }
                sx={{ borderRadius: 2 }}
              >
                Einladungen
              </Button>
              <Tooltip title="Aktualisieren">
                <span>
                  <IconButton
                    onClick={() => {
                      refetchEvent();
                      refetchTickets();
                    }}
                    disabled={evLoading || tkLoading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          }
        />
        {(evLoading || seatsLoading) && (
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
                  <>
                    <Chip
                      size="small"
                      icon={<GroupsIcon />}
                      label={`Max Seats: ${event.maxSeats}`}
                    />
                    <Chip
                      size="small"
                      label={`Sitze übrig: ${typeof event.maxSeats === 'number' ? Math.max(0, (event.maxSeats as number) - (tickets?.length || 0)) : '—'}`}
                      color={
                        typeof event.maxSeats === 'number' &&
                        Math.max(
                          0,
                          (event.maxSeats as number) - (tickets?.length || 0),
                        ) > 0
                          ? 'info'
                          : 'default'
                      }
                    />
                  </>
                )}
              </Stack>
            </Stack>
          </CardContent>
        )}
      </Card>

      {(tkError || err) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(tkError?.message ?? err)}
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
              placeholder="Suchen (ID, Invitation, Sitz, Key, State)"
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
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>State</InputLabel>
              <Select
                label="State"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as any)}
              >
                <MenuItem value="ALL">Alle</MenuItem>
                {Array.from(
                  new Set(
                    tickets
                      .map((t) => t.currentState)
                      .filter(Boolean) as string[],
                  ),
                )
                  .sort((a, b) => a.localeCompare(b))
                  .map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Revoked</InputLabel>
              <Select
                label="Revoked"
                value={revokedFilter}
                onChange={(e) => setRevokedFilter(e.target.value as any)}
              >
                <MenuItem value="ALL">Alle</MenuItem>
                <MenuItem value="YES">Ja</MenuItem>
                <MenuItem value="NO">Nein</MenuItem>
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
              <ToggleButton value="seat" aria-label="Seat">
                Seat
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Massenaktionen */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ ml: 'auto' }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allFilteredSelected}
                    onChange={(e) => selectAll(filteredIds, e.target.checked)}
                  />
                }
                label="Alle auswählen"
              />
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={selectedCount === 0 || deleting}
                onClick={() => setConfirmBulkOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                Löschen ({selectedCount})
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Liste */}
      <Stack spacing={1.25} sx={{ mb: 2 }}>
        {tkLoading && (
          <Card variant="outlined">
            <CardContent>
              <Typography>Wird geladen…</Typography>
            </CardContent>
          </Card>
        )}
        {!tkLoading && filteredSorted.length === 0 && (
          <Alert severity="info">Keine Tickets gefunden.</Alert>
        )}

        {filteredSorted.map((t) => {
          const expanded = expandedId === t.id;

          const seat = t.seatId ? (seatMap.get(t.seatId) ?? null) : null;
          const seatTitle = t.seatId ? prettySeatTitle(seat) : 'Ohne Sitz';
          const seatDetail = compactSeatDetail(seat);

          const title = seatTitle;
          const subtitle = t.invitationId
            ? `Invitation: ${t.invitationId}`
            : 'Ohne Invitation';

          return (
            <Card
              key={t.id}
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
                  checked={selectedIds.has(t.id)}
                  onChange={(e) => toggleSelect(t.id, e.target.checked)}
                  sx={{ mr: 0.5 }}
                />
                <Avatar sx={{ width: 32, height: 32 }}>
                  {initialsOf(seatTitle)}
                </Avatar>

                <Tooltip
                  title={
                    <Stack spacing={0.5}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Sitzdetails
                      </Typography>
                      <Typography variant="caption">{seatDetail}</Typography>
                      {seat?.note && (
                        <Typography variant="caption" color="text.secondary">
                          Notiz: {seat.note}
                        </Typography>
                      )}
                      {t.seatId && (
                        <Typography variant="caption" color="text.disabled">
                          ID: {t.seatId}
                        </Typography>
                      )}
                    </Stack>
                  }
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{ minWidth: 0, flex: 1 }}
                    onClick={() => setExpandedId(expanded ? null : t.id)}
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
                      {title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subtitle}
                    </Typography>
                  </Box>
                </Tooltip>

                {t.revoked ? (
                  <Chip
                    size="small"
                    label="Revoked"
                    color="warning"
                    variant="filled"
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Aktiv"
                    color="success"
                    variant="outlined"
                  />
                )}
                {t.currentState && (
                  <Chip
                    size="small"
                    label={t.currentState}
                    variant="outlined"
                    sx={{ ml: 0.5 }}
                  />
                )}

                <IconButton
                  size="small"
                  aria-label="expand"
                  onClick={() => setExpandedId(expanded ? null : t.id)}
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

              {/* Body */}
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider />
                <CardContent sx={{ pt: 1.25 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Ticket-ID
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TextField
                          value={t.id}
                          size="small"
                          fullWidth
                          inputProps={{ readOnly: true }}
                        />
                        <Tooltip title="ID kopieren">
                          <IconButton onClick={() => onCopy(t.id, 'ID')}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Invitation-ID
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TextField
                          value={t.invitationId || ''}
                          size="small"
                          fullWidth
                          inputProps={{ readOnly: true }}
                          placeholder="—"
                        />
                        {t.invitationId && (
                          <>
                            <Tooltip title="Invitation-ID kopieren">
                              <IconButton
                                onClick={() =>
                                  onCopy(t.invitationId!, 'Invitation-ID')
                                }
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Zur Invitation">
                              <IconButton
                                component={Link}
                                href={`/admin/invitations/${t.invitationId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="caption" color="text.secondary">
                        Sitz
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip
                          title={
                            <Stack spacing={0.5}>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700 }}
                              >
                                Sitzdetails
                              </Typography>
                              <Typography variant="caption">
                                {seatDetail}
                              </Typography>
                              {seat?.note && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Notiz: {seat.note}
                                </Typography>
                              )}
                              {t.seatId && (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                >
                                  ID: {t.seatId}
                                </Typography>
                              )}
                            </Stack>
                          }
                          arrow
                          placement="top"
                        >
                          <TextField
                            value={seatTitle}
                            size="small"
                            fullWidth
                            inputProps={{ readOnly: true }}
                          />
                        </Tooltip>
                        {seat?.note && (
                          <Tooltip title={seat.note}>
                            <InfoOutlinedIcon fontSize="small" color="action" />
                          </Tooltip>
                        )}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={6}>
                      <Typography variant="caption" color="text.secondary">
                        Device Key
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TextField
                          value={t.deviceBoundKey || ''}
                          size="small"
                          fullWidth
                          inputProps={{ readOnly: true }}
                          placeholder="—"
                        />
                        {t.deviceBoundKey && (
                          <Tooltip title="Device Key kopieren">
                            <IconButton
                              onClick={() =>
                                onCopy(t.deviceBoundKey!, 'Device Key')
                              }
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        Erstellt
                      </Typography>
                      <TextField
                        value={toLocal(t.createdAt)}
                        size="small"
                        fullWidth
                        inputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        Aktualisiert
                      </Typography>
                      <TextField
                        value={toLocal(t.updatedAt)}
                        size="small"
                        fullWidth
                        inputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>

                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="flex-end"
                    sx={{ pt: 1.25 }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setConfirmDeleteId(t.id)}
                      sx={{ borderRadius: 2 }}
                    >
                      Löschen
                    </Button>
                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
          );
        })}
      </Stack>

      {/* Dialog: Einzel-Löschen */}
      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Ticket löschen?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Dieses Ticket wird endgültig entfernt. Vorgang kann nicht rückgängig
            gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Abbrechen</Button>
          <Button
            onClick={async () => {
              const id = confirmDeleteId!;
              setConfirmDeleteId(null);
              await onDeleteSingle(id);
            }}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Massenlöschen */}
      <Dialog
        open={confirmBulkOpen}
        onClose={() => setConfirmBulkOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{`Ausgewählte Tickets löschen (${selectedCount})?`}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Die ausgewählten Tickets werden endgültig entfernt. Vorgang kann
            nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkOpen(false)}>Abbrechen</Button>
          <Button
            onClick={onDeleteBulk}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

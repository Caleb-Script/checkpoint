// /web/src/app/invitations/approve/page.tsx
'use client';

import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
  Typography,
} from '@mui/material';
import * as React from 'react';
import { EVENT_SEATS } from '../../../../graphql/event/query';
import { UPDATE_INVITATION } from '../../../../graphql/invitation/mutation';
import { INVITATIONS } from '../../../../graphql/invitation/query';
import { CREATE_TICKET } from '../../../../graphql/ticket/mutation';
import { GET_TICKETS } from '../../../../graphql/ticket/query';
import { Seat } from '../../../../types/event/seat.type';
import {
  Invitation,
  InvitationsQueryResult,
} from '../../../../types/invitation/invitation.type';
import { Ticket } from '../../../../types/ticket/ticket.type';

export default function ApprovePage() {
  const { data, loading, error, refetch } = useQuery<InvitationsQueryResult>(
    INVITATIONS,
    { fetchPolicy: 'cache-and-network' },
  );

  const [updateInvitation, { loading: approving, error: updateErr }] =
    useMutation(UPDATE_INVITATION);

  const [createTicket, { loading: creatingTicket }] =
    useMutation(CREATE_TICKET);

  // Für freie Sitzplätze:
  const [loadTickets, { data: ticketsData }] = useLazyQuery(GET_TICKETS, {
    fetchPolicy: 'cache-first',
  });
  const [loadSeats, { data: seatsData, loading: seatsLoading }] = useLazyQuery(
    EVENT_SEATS,
    { fetchPolicy: 'cache-first' },
  );

  // Dialog-State
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<Invitation | null>(null);
  const [seatId, setSeatId] = React.useState<string>(''); // '' = keine Auswahl → Zufällig
  const [filter, setFilter] = React.useState('');
  const [onlyFree, setOnlyFree] = React.useState(true);

  function seatsForEvent(eventId: string): Seat[] {
    const all = seatsData?.eventSeats ?? [];
    if (!all.length) return [];
    // belegte seatIds über Tickets bestimmen:
    const taken = new Set(
      (ticketsData?.getTickets ?? [])
        .filter((t: Ticket) => t.eventId === eventId && t.seatId)
        .map((t: Ticket) => t.seatId),
    );
    let list = all as Seat[];
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
    // Daten für dieses Event laden
    await Promise.all([
      loadTickets(),
      loadSeats({
        variables: {
          eventId: inv.eventId,
          offset: 0,
          limit: 1000,
          filter: null,
        },
      }),
    ]);
    setOpen(true);
  }

  async function approveWithSeat() {
    if (!current) return;
    // 1) Einladung approven
    await updateInvitation({ variables: { id: current.id, approved: true } });
    // 2) Ticket erzeugen – seatId optional ('' => Zufällig -> als null übergeben)
    try {
      await createTicket({
        variables: {
          eventId: current.eventId,
          invitationId: current.id,
          seatId: seatId ? seatId : null,
        },
      });
    } catch {
      // z. B. wenn Ticket bereits existiert → ignorieren
    }
    setOpen(false);
    await refetch();
  }

  const rows = (data?.invitations ?? []).filter(
    (i) => i.rsvpChoice === 'YES' && !i.approved,
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title="Approve Flow"
        titleTypographyProps={{ variant: 'h5', sx: { fontWeight: 800 } }}
        action={
          <Button onClick={() => refetch()} variant="outlined">
            Aktualisieren
          </Button>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}
        {updateErr && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateErr.message}
          </Alert>
        )}
        {loading && !data && <Typography>Wird geladen…</Typography>}
        {!loading && rows.length === 0 && (
          <Typography>Keine offenen Zusagen.</Typography>
        )}

        {rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invitation ID</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>RSVP</TableCell>
                <TableCell align="right">Aktion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.eventId}</TableCell>
                  <TableCell>{r.rsvpChoice}</TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => openAssign(r)}
                        disabled={approving || creatingTicket}
                      >
                        Approven & Sitz zuweisen
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

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
            {!seatsLoading && current && (
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
                    {seatsForEvent(current.eventId).map((s) => (
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
                  Nichts ausgewählt = Zufälliger Sitz (serverseitig). Du kannst
                  den Sitz später jederzeit ändern (sobald der{' '}
                  <i>Update Ticket</i>-Resolver verfügbar ist).
                </Alert>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button
              onClick={approveWithSeat}
              variant="contained"
              disabled={approving || creatingTicket}
            >
              Approven & Ticket anlegen
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

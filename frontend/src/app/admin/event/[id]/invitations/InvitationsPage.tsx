// /frontend/src/features/admin/invitations/InvitationsPage.tsx
'use client';

import {
  useApolloClient,
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';

type Props = { eventId: string };

type CreateTicketResult = {
  createTicket: { id: string };
};

export function InvitationsPage({ eventId }: Props): JSX.Element {
  const router = useRouter();
  const client = useApolloClient();

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

  // Invitations
  const {
    data: invData,
    loading: invLoading,
    error: invError,
    refetch: refetchInvs,
  } = useQuery<InvitationsQueryResult>(INVITATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const allInvs: Invitation[] = invData?.invitations ?? [];
  const eventInvs: Invitation[] = allInvs.filter((i) => i.eventId === eventId);

  // Mutations
  const [approveInvitation, { loading: approving }] =
    useMutation(APPROVE_INVITATION);
  const [updateInvitation, { loading: updating }] =
    useMutation(UPDATE_INVITATION);
  const [createPlusOne, { loading: plusOneCreating }] = useMutation(
    CREATE_PLUS_ONES_INVITATION,
  );
  const [createTicket, { loading: creatingTicket }] =
    useMutation<CreateTicketResult>(CREATE_TICKET);

  // Lazy Queries
  const [loadTickets, { data: ticketsData, refetch: refetchTickets }] =
    useLazyQuery<{ getTickets: TicketRow[] }>(GET_TICKETS, {
      fetchPolicy: 'cache-first',
    });
  const [loadSeats, { data: seatsData, loading: seatsLoading }] = useLazyQuery<{
    seatsByEvent: SeatRow[];
    seatsByEventCount: number;
  }>(EVENT_SEATS, { fetchPolicy: 'cache-first' });

  React.useEffect(() => {
    if (eventId) loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // UI state
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [createdTicketInvIds, setCreatedTicketInvIds] = React.useState<
    Set<string>
  >(new Set());

  // Filters
  const [search, setSearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');
  const [rsvpFilter, setRsvpFilter] = React.useState<RsvpFilter>('ALL');
  const [sortBy, setSortBy] = React.useState<SortKey>('updatedAt');

  // Derived lists
  const { visibleInvitations, currentFilteredIds, allFilteredSelected } =
    useInvitationLists({
      allInvs: eventInvs,
      search,
      statusFilter,
      rsvpFilter,
      sortBy,
      selectedIds,
      displayName,
    });

  // Tickets mapping (badge)
  const invitationIdsWithTicket = React.useMemo(() => {
    const s = new Set<string>();
    (ticketsData?.getTickets ?? [])
      .filter((t) => t.eventId === eventId && t.invitationId)
      .forEach((t) => s.add(String(t.invitationId)));
    createdTicketInvIds.forEach((id) => s.add(id));
    return s;
  }, [ticketsData?.getTickets, eventId, createdTicketInvIds]);

  // Seats helpers
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignFor, setAssignFor] = React.useState<Invitation | null>(null);

  function seatsForEvent(onlyFree: boolean, filterText: string): SeatRow[] {
    const all = seatsData?.seatsByEvent ?? [];
    if (!all.length) return [];
    const taken = new Set(
      (ticketsData?.getTickets ?? [])
        .filter((t) => t.eventId === eventId && t.seatId)
        .map((t) => t.seatId as string),
    );
    let list = all.slice();
    if (onlyFree) list = list.filter((s) => !taken.has(s.id));
    const ft = filterText.trim().toLowerCase();
    if (ft) {
      list = list.filter((s) =>
        [s.section, s.row, s.number, s.table, s.note]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(ft)),
      );
    }
    return list;
  }

  async function openAssign(inv: Invitation) {
    setAssignFor(inv);
    await Promise.all([
      loadTickets(),
      loadSeats({
        variables: { eventId, offset: 0, limit: 1000, filter: null },
      }),
    ]);
    setAssignOpen(true);
  }

  // Actions
  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function selectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) currentFilteredIds.forEach((id) => n.add(id));
      else currentFilteredIds.forEach((id) => n.delete(id));
      return n;
    });
  }

  async function bulkApprove(approve: boolean) {
    setErr(null);
    setMsg(null);
    const ids = Array.from(selectedIds);
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

  async function approveWithSeat(selectedSeatId: string) {
    if (!assignFor) return;
    setErr(null);
    setMsg(null);

    try {
      // Subscription vor Approve (Race vermeiden)
      const waitPromise = waitForInvitationBySub(
        client,
        INVITATION_UPDATED_SUB,
        assignFor.id,
        { timeoutMs: 20000 },
      );

      await approveInvitation({
        variables: { id: assignFor.id, approved: true },
      });

      const invAfter = await waitPromise;
      const guestProfileId = invAfter?.guestProfileId ?? null;
      if (!guestProfileId) {
        setErr(
          'Es kam kein Subscription-Event mit guestProfileId an. Bitte erneut versuchen.',
        );
        return;
      }

      await createTicket({
        variables: {
          eventId,
          invitationId: assignFor.id,
          seatId: selectedSeatId || null,
          guestProfileId,
        },
      });

      setCreatedTicketInvIds((prev) => new Set(prev).add(assignFor.id));
      setMsg('Freigegeben und Ticket erstellt.');
      setAssignOpen(false);
      setAssignFor(null);
      await Promise.all([refetchInvs(), refetchTickets?.()]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(`Fehler: ${message}`);
    }
  }

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <HeaderCard
        event={event}
        evLoading={evLoading}
        evError={evError}
        onRefresh={() => {
          refetchEvent();
          refetchInvs();
          refetchTickets?.();
        }}
        onCreate={() => router.push(`/admin/event/${eventId}/invite`)}
        toLocal={toLocal}
      />

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

      {/* Filter & Bulk */}
      <FiltersBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        rsvpFilter={rsvpFilter}
        onRsvpFilter={setRsvpFilter}
        sortBy={sortBy}
        onSortBy={setSortBy}
        allFilteredSelected={allFilteredSelected}
        onSelectAll={selectAll}
        selectedCount={
          Array.from(selectedIds).filter((id) =>
            currentFilteredIds.includes(id),
          ).length
        }
        onBulkApprove={() => bulkApprove(true)}
        onBulkRevoke={() => bulkApprove(false)}
        bulkDisabled={approving}
      />

      {/* List */}
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

        {!invLoading &&
          visibleInvitations.map((inv) => {
            const parent = inv.invitedByInvitationId
              ? (allInvs.find((x) => x.id === inv.invitedByInvitationId) ??
                null)
              : null;

            return (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                parentInvitation={parent}
                displayName={displayName}
                initialsOf={initialsOf}
                toLocal={toLocal}
                hasTicket={invitationIdsWithTicket.has(inv.id)}
                expandedId={expandedId}
                onToggleExpand={() =>
                  setExpandedId(expandedId === inv.id ? null : inv.id)
                }
                selected={selectedIds.has(inv.id)}
                onToggleSelected={(checked) => toggleSelect(inv.id, checked)}
                onApprove={async (approved) => {
                  await approveInvitation({
                    variables: { id: inv.id, approved },
                  });
                  await refetchInvs();
                }}
                onRsvpYes={() => rsvpYes(inv.id)}
                onRsvpNo={() => rsvpNo(inv.id)}
                onAddPlusOne={() => addPlusOne(inv.id)}
                onOpenAssign={() => openAssign(inv)}
                eventName={(event?.name ?? '') as string}
              />
            );
          })}
      </Stack>

      {/* Assign dialog */}
      <AssignSeatDialog
        open={assignOpen}
        loading={seatsLoading || creatingTicket || approving}
        seatsProvider={(onlyFree, filterText) =>
          seatsForEvent(onlyFree, filterText)
        }
        onClose={() => {
          setAssignOpen(false);
          setAssignFor(null);
        }}
        onConfirm={(seatId) => approveWithSeat(seatId)}
      />
    </Box>
  );
}

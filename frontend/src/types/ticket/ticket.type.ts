export type Ticket = {
  id: string;
  eventId: string;
  invitationId: string;
  seatId?: string | null;
  currentState: 'INSIDE' | 'OUTSIDE';
  deviceBoundKey?: string | null;
  revoked?: boolean | null;
};

export type GetTicketsResult = { getTickets: Ticket[] };

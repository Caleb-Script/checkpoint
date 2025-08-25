export type Ticket = {
  id: string;
  eventId: string;
  invitationId: string;
  seatId?: string | null;
  currentState: 'INSIDE' | 'OUTSIDE';
  deviceBoundKey?: string | null;
};

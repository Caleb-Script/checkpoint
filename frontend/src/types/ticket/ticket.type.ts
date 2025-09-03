export type Ticket = {
  id: string;
  eventId: string;
  invitationId: string;
  guestProfileId?: string;
  seatId?: string;
  currentState: 'INSIDE' | 'OUTSIDE';
  deviceBoundKey?: string;
  revoked?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

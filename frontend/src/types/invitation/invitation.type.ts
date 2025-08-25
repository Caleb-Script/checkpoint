export type Invitation = {
  id: string;
  eventId: string;
  guestProfileId?: string | null;
  invitedByInvitationId?: string | null;
  maxInvitees: number;
  rsvpChoice?: 'YES' | 'NO' | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
  approved: boolean;
  plusOnes?: Invitation[];
};

export type InvitationsQueryResult = {
  invitations: Invitation[];
};

export type InvitationQueryResult = {
  invitation: Invitation | null;
};

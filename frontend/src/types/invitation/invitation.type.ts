export type Invitation = {
  id: string;
  eventId: string;
  firstName?: string;
  lastName?: string;
  guestProfileId?: string | null;
  invitedByInvitationId?: string | null;
  maxInvitees: number;
  rsvpChoice?: 'YES' | 'NO' | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
  approved: boolean;
  plusOnes?: string[];
  createdAt: Date;
  updatedAt: Date;
  rsvpAt?: Date;
  approvedById?: string;
  approvedAt?: Date
  invitedById?: string;
  phone?: string;
  email?: string;
};

export type RSVPReply = {
  reply: 'YES' | 'NO';
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
};

export type CreatePlusOnesInvitationInput = {
  eventId: string;
  invitedByInvitationId: string;
  firstName: string;
  lastName: string;
};

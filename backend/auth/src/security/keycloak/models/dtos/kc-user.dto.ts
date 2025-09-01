export type KeycloakUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  attributes?: {
    ticketId?: string[];
    invitationId?: string[];
    phoneNumber?: string[];
  };
};

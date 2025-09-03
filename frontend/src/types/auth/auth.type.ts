export type LoginInput = {
  username: string;
  password: string;
};

export type Token = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  idToken: string;
  scope: string;
};

export type User = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string
  roles: string[];
  ticketId?: string;
  invitationId?: string;
};
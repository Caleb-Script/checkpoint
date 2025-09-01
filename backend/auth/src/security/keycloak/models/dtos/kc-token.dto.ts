import * as jose from 'jose';

export type KeycloakTokenPayload = jose.JWTPayload & {
  sub: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  realm_access?: { roles?: string[] };
  ticket_id?: string;
  invitation_id?: string;
  phone_number: string;
  iss?: string; // issuer
  azp?: string; // authorized party (client)
};

export type KeycloakToken = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  id_token: string;
  scope: string;
};

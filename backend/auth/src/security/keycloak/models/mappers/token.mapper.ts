import { KeycloakToken } from '../dtos/kc-token.dto.js';
import { TokenPayload } from '../payloads/token.payload.js';

export function toToken(tokenPayload: KeycloakToken) {
  const token: TokenPayload = {
    accessToken: tokenPayload.access_token,
    expiresIn: tokenPayload.expires_in,
    refreshToken: tokenPayload.refresh_token,
    refreshExpiresIn: tokenPayload.refresh_expires_in,
    idToken: tokenPayload.id_token,
    scope: tokenPayload.scope,
  };

  return token;
}

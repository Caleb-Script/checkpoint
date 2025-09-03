// /backend/auth/src/security/keycloak/mappers/user.mapper.ts

import type { KeycloakTokenPayload } from '../dtos/kc-token.dto.js';
import type { KeycloakUser } from '../dtos/kc-user.dto.js';
import type { User } from '../entitys/user.entity.js';

/**
 * @file User-Mapper zwischen externen Keycloak-Modellen (Admin-API & JWT)
 *       und internen Domain-Entities.
 *
 * @remarks
 * - Verwendet **keine** mutierenden Operationen (z. B. `.pop()`).
 * - Unterstützt sowohl Admin-API-Responses (`KeycloakUser`) als auch
 *   Access-Token Payloads (`KeycloakTokenPayload`) via **Overloads**.
 * - Strikt typisiert (kein `any`), defensiv gegenüber `string | string[] | undefined`.
 *
 * @packageDocumentation
 */

/**
 * Bekannte Attributschlüssel, die in Keycloak-User-Attributen erwartet werden.
 */
type KnownAttrKey = 'phoneNumber' | 'ticketId' | 'invitationId';

/**
 * Liefert – ohne Mutation – den **ersten String** zu einem bekannten Attributschlüssel
 * aus dem Keycloak-Attributobjekt (das häufig `string | string[] | undefined` enthält).
 *
 * @param attrs - Das Attributobjekt aus Keycloak (beliebige Struktur).
 * @param key - Erwarteter Schlüssel (z. B. `"phoneNumber"`).
 * @returns Erster String-Wert oder `undefined`, falls nicht vorhanden.
 *
 * @example
 * ```ts
 * const phone = firstStringFromAttrs(user.attributes, 'phoneNumber'); // "0151..."
 * ```
 */
function firstStringFromAttrs(
  attrs: unknown,
  key: KnownAttrKey,
): string | undefined {
  if (attrs === null || typeof attrs !== 'object') return undefined;
  const value = (attrs as Record<string, unknown>)[key];

  if (typeof value === 'string') return value;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'string'
  ) {
    return value[0] as string;
  }
  return undefined;
}

/**
 * Prüft zur Laufzeit, ob es sich beim Eingabewert um einen `KeycloakUser` handelt.
 *
 * @param v - Kandidat (KeycloakUser oder KeycloakTokenPayload).
 * @returns `true` genau dann, wenn `v` wie ein `KeycloakUser` aussieht.
 */
function isKeycloakUser(
  v: KeycloakUser | KeycloakTokenPayload,
): v is KeycloakUser {
  return (
    typeof (v as KeycloakUser)?.id === 'string' &&
    typeof (v as KeycloakUser)?.username === 'string' &&
    typeof (v as KeycloakUser)?.email === 'string'
  );
}

/**
 * Mappt ein Admin-API-Modell (`KeycloakUser`) auf die interne `User`-Entity.
 *
 * @param u - KeycloakUser (z. B. aus `/admin/realms/{realm}/users`).
 * @returns Abgeleiteter Domain-User.
 *
 * @example
 * ```ts
 * const domainUser = fromKeycloakUser(keycloakUser);
 * ```
 */
function fromKeycloakUser(u: KeycloakUser): User {
  const phoneNumber = firstStringFromAttrs(u.attributes, 'phoneNumber');
  const ticketId = firstStringFromAttrs(u.attributes, 'ticketId');
  const invitationId = firstStringFromAttrs(u.attributes, 'invitationId');

  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phoneNumber,
    ticketId,
    invitationId,
    // Hinweis: Die Admin-API liefert i. d. R. keine Rollen mit.
    roles: [],
  };
}

/**
 * Mappt ein Access-Token-Payload (`KeycloakTokenPayload`) auf die interne `User`-Entity.
 *
 * @param p - Verifiziertes JWT-Payload (z. B. via `jose.jwtVerify`).
 * @returns Abgeleiteter Domain-User mit Rollen.
 *
 * @example
 * ```ts
 * const domainUser = fromTokenPayload(tokenPayload);
 * ```
 */
function fromTokenPayload(p: KeycloakTokenPayload): User {
  return {
    id: p.sub,
    username: p.preferred_username ?? 'N/A',
    firstName: p.given_name ?? 'N/A',
    lastName: p.family_name ?? 'N/A',
    email: p.email ?? 'N/A',
    roles: p.realm_access?.roles ?? [],
    invitationId: p.invitation_id,
    ticketId: p.ticket_id,
    phoneNumber: p.phone_number,
  };
}

/**
 * Wandelt eine Liste von `KeycloakUser` in eine Liste von Domain-`User` um.
 *
 * @param usersRaw - `KeycloakUser[]` (z. B. aus der Admin-API).
 * @returns Konvertierte `User[]`.
 *
 * @example
 * ```ts
 * const list = toUsers(keycloakUsers);
 * ```
 */
export function toUsers(usersRaw: ReadonlyArray<KeycloakUser>): User[] {
  return usersRaw.map(fromKeycloakUser);
}

/**
 * Overload: Wandelt **einen** `KeycloakUser` in einen Domain-`User` um.
 *
 * @param src - Keycloak-Userobjekt.
 * @returns Domain-`User`.
 */
export function toUser(src: KeycloakUser): User;

/**
 * Overload: Wandelt **ein** `KeycloakTokenPayload` in einen Domain-`User` um.
 *
 * @param src - JWT-Payload (Access Token).
 * @returns Domain-`User` mit Rollen.
 */
export function toUser(src: KeycloakTokenPayload): User;

/**
 * Implementierung für beide Overloads.
 *
 * @param src - Entweder `KeycloakUser` **oder** `KeycloakTokenPayload`.
 * @returns Domain-`User`.
 *
 * @example
 * ```ts
 * const u1 = toUser(keycloakUser);          // Admin-API → Domain
 * const u2 = toUser(keycloakTokenPayload);  // JWT → Domain
 * ```
 */
export function toUser(src: KeycloakUser | KeycloakTokenPayload): User {
  return isKeycloakUser(src) ? fromKeycloakUser(src) : fromTokenPayload(src);
}

/**
 * Optionaler Wrapper mit statischen Utilities – praktisch, wenn du eine
 * Klassenreferenz (statt freier Funktionen) in DI/Modulen dokumentieren möchtest.
 *
 * @public
 */
export class UserMappers {
  /**
   * @see {@link toUsers}
   */
  static toUsers(usersRaw: ReadonlyArray<KeycloakUser>): User[] {
    return toUsers(usersRaw);
  }

  /**
   * @see {@link toUser}
   */
  static toUser(src: KeycloakUser | KeycloakTokenPayload): User {
    return toUser(src as KeycloakUser & KeycloakTokenPayload);
  }
}

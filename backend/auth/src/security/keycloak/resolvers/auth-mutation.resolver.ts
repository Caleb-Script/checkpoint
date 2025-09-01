// /backend/auth/src/security/keycloak/resolvers/auth.mutation.resolver.ts
import { UseInterceptors } from '@nestjs/common';
import { Args, Context, ID, Mutation, Resolver } from '@nestjs/graphql';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';

import { getLogger } from '../../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../../logger/response-time.interceptor.js';

import { Role } from '../models/enums/role.enum.js';
import { LogInInput } from '../models/inputs/log-in.input.js';
import { SignInInput } from '../models/inputs/sign-in.input.js';
import {
  UpdateUserInput,
  UpdateUserPasswordInput,
} from '../models/inputs/update-user.input.js';
import { SignInPayload } from '../models/payloads/sign-in.payload.js';
import { TokenPayload } from '../models/payloads/token.payload.js';
import { KeycloakWriteService } from '../services/keycloak-write.service.js';
import { BadUserInputError } from '../utils/error.util.js';

/**
 * @file GraphQL-Resolver für **schreibende** Auth-Operationen.
 *
 * @remarks
 * Enthält:
 * - `login`, `refresh`, `logout`
 * - `signIn` (User anlegen + Events)
 * - `updateUser`, `setUserPassword`, `deleteUser`
 * - `assignRealmRole`, `removeRealmRole`
 *
 * Setzt/aktualisiert HttpOnly-Cookies:
 *  - `kc_access_token`
 *  - `kc_refresh_token`
 *
 * Alle Endpunkte sind hier mit `@Public()` markiert. In Produktion
 * solltest du die Mutationen nach Bedarf mit Rollen absichern.
 */

type GqlCtx = { req: Request; res: Response };

const cookieOpts = (maxAgeMs?: number): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  path: '/',
  maxAge: maxAgeMs ?? undefined, // ms
});

function setCookieSafe(
  res: Response | undefined,
  name: string,
  value: string,
  opts: CookieOptions,
): void {
  if (!res) return;
  res.cookie(name, value, opts);
}

function clearCookieSafe(res: Response | undefined, name: string): void {
  if (!res) return;
  // Beim Löschen maxAge undefined lassen, sonst wird ein neues Cookie gesetzt
  res.clearCookie(name, cookieOpts(undefined));
}

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
export class AuthMutationResolver {
  private readonly logger = getLogger(AuthMutationResolver.name);

  constructor(private readonly write: KeycloakWriteService) {}

  /**
   * Passwort-Login (ROPC). Setzt `kc_access_token` & `kc_refresh_token` als
   * HttpOnly-Cookies und gibt das Token-Payload zurück.
   */
  @Mutation(() => TokenPayload, { name: 'login' })
  @Public()
  async login(
    @Args('input', { type: () => LogInInput }) input: LogInInput,
    @Context() ctx: GqlCtx,
  ): Promise<TokenPayload> {
    const { username, password } = input;
    this.logger.debug('login: username=%s', username);

    const result = await this.write.login({ username, password });
    if (!result) {
      throw new BadUserInputError(
        'Falscher Benutzername oder falsches Passwort',
      );
    }

    setCookieSafe(
      ctx?.res,
      'kc_access_token',
      result.accessToken,
      cookieOpts(result.expiresIn * 1000),
    );
    setCookieSafe(
      ctx?.res,
      'kc_refresh_token',
      result.refreshToken,
      cookieOpts(result.refreshExpiresIn * 1000),
    );
    return result;
  }

  /**
   * Erneuert Tokens per `refreshToken`. Wenn kein Argument übergeben wird,
   * wird automatisch der `kc_refresh_token`-Cookie verwendet (falls vorhanden).
   * Setzt die Cookies erneut.
   */
  @Mutation(() => TokenPayload, { name: 'refresh' })
  @Public()
  async refresh(
    @Args('refreshToken', { type: () => String, nullable: true })
    refreshToken: string | null,
    @Context() ctx: GqlCtx,
  ): Promise<TokenPayload> {
    const token =
      refreshToken ??
      (ctx?.req?.cookies?.kc_refresh_token as string | undefined);

    const result = await this.write.refresh(token);
    if (!result) {
      throw new BadUserInputError('Falscher oder abgelaufener Refresh-Token');
    }

    setCookieSafe(
      ctx?.res,
      'kc_access_token',
      result.accessToken,
      cookieOpts(result.expiresIn * 1000),
    );
    setCookieSafe(
      ctx?.res,
      'kc_refresh_token',
      result.refreshToken,
      cookieOpts(result.refreshExpiresIn * 1000),
    );
    return result;
  }

  /**
   * Logout: invalidiert den Refresh-Token bei Keycloak und leert die Cookies.
   */
  @Mutation(() => Boolean, { name: 'logout' })
  @Public()
  async logout(@Context() ctx: GqlCtx): Promise<boolean> {
    const refreshToken = ctx?.req?.cookies?.kc_refresh_token as
      | string
      | undefined;
    await this.write.logout(refreshToken);
    clearCookieSafe(ctx?.res, 'kc_access_token');
    clearCookieSafe(ctx?.res, 'kc_refresh_token');
    return true;
  }

  /**
   * User anlegen (Sign-In/Onboarding).
   * - Erzeugt Username/Passwort
   * - Setzt invitationId/phoneNumber als Attribute (append)
   * - Weist Realm-Rolle `GUEST` zu
   * - Sendet Kafka-Events (addUser, sendUserCredentials)
   */
  @Mutation(() => SignInPayload, { name: 'signIn' })
  @Public()
  async signIn(
    @Args('input', { type: () => SignInInput }) input: SignInInput,
  ): Promise<SignInPayload> {
    this.logger.debug('signIn: input=%o', input);
    const result = await this.write.signUp(input);
    if (!result) {
      throw new BadUserInputError('User konnte nicht angelegt werden');
    }
    // Shape entspricht SignInPayload { userId, username, password }
    return result;
  }

  // --------- User-Management ---------

  /**
   * Profilfelder aktualisieren (firstName/lastName/email).
   */
  @Mutation(() => Boolean, { name: 'updateUser' })
  @Public()
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateUserInput }) input: UpdateUserInput,
  ): Promise<boolean> {
    await this.write.updateUser(id, input);
    return true;
  }

  /**
   * Passwort setzen (nicht temporär).
   */
  @Mutation(() => Boolean, { name: 'setUserPassword' })
  @Public()
  async setUserPassword(
    @Args('input', { type: () => UpdateUserPasswordInput })
    input: UpdateUserPasswordInput,
  ): Promise<boolean> {
    await this.write.setUserPassword(input.id, input.newPassword);
    return true;
  }

  /**
   * Benutzer löschen.
   */
  @Mutation(() => Boolean, { name: 'deleteUser' })
  @Public()
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.write.deleteUser(id);
    return true;
  }

  // --------- Rollen-Management ---------

  /**
   * Realm-Rolle einem Benutzer zuweisen.
   */
  @Mutation(() => Boolean, { name: 'assignRealmRole' })
  @Public()
  async assignRealmRole(
    @Args('id', { type: () => ID }) id: string,
    @Args('roleName', { type: () => Role }) roleName: Role,
  ): Promise<boolean> {
    await this.write.assignRealmRoleToUser(id, roleName);
    return true;
  }

  /**
   * Realm-Rolle von einem Benutzer entfernen.
   */
  @Mutation(() => Boolean, { name: 'removeRealmRole' })
  @Public()
  async removeRealmRole(
    @Args('id', { type: () => ID }) id: string,
    @Args('roleName', { type: () => Role }) roleName: Role,
  ): Promise<boolean> {
    await this.write.removeRealmRoleFromUser(id, roleName);
    return true;
  }
}

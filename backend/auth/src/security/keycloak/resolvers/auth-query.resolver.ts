// /backend/auth/src/security/keycloak/resolvers/auth.query.resolver.ts
import { UseInterceptors } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';

import { getLogger } from '../../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../../logger/response-time.interceptor.js';

import { KeycloakReadService } from '../services/keycloak-read.service.js';
import { BadUserInputError } from '../utils/error.util.js';

import { User } from '../models/entitys/user.entity.js';

/**
 * @file GraphQL-Resolver für **lesende** Auth-Abfragen (ME/USERS).
 *
 * @remarks
 * - Nutzt den {@link KeycloakReadService} für sämtliche Leseoperationen.
 * - Liest das Access-Token bevorzugt aus dem HttpOnly-Cookie `kc_access_token`,
 *   alternativ aus dem optionalen Query-Argument `token`.
 * - Öffentliche Endpunkte sind mit `@Public()` gekennzeichnet.
 * - Strikt typisiert, keine Verwendung von `any`.
 *
 * @packageDocumentation
 */

/** GraphQL-Kontext (HTTP Request/Response) */
type GqlCtx = { req: Request; res: Response };

/** Request-Typ mit optionalen Cookies (ohne `any`, keine globalen Typ-Augmentationen erforderlich) */
type CookieRequest = Request & { cookies?: Record<string, unknown> };

/** Liest den `kc_access_token` Cookie sicher und typisiert aus. */
function readAccessTokenFromCookie(
  req: Request | undefined,
): string | undefined {
  if (!req) return undefined;
  const cookieReq = req as CookieRequest;
  const value = cookieReq.cookies?.kc_access_token;
  return typeof value === 'string' ? value : undefined;
}

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
/**
 * Stellt Queries rund um Benutzerinformationen bereit:
 * - `users`: Liste aller Realm-User
 * - `me`: Informationen zum aktuellen Benutzer (aus Access-Token)
 * - `getById`: Benutzer per ID
 */
export class AuthQueryResolver {
  private readonly logger = getLogger(AuthQueryResolver.name);

  constructor(private readonly read: KeycloakReadService) {}

  /**
   * Liste aller Benutzer im Realm.
   *
   * @returns Array von {@link User}
   *
   * @example
   * ```graphql
   * query {
   *   users { id username email }
   * }
   * ```
   */
  @Query(() => [User], { name: 'users' })
  @Public()
  async getUsers(): Promise<User[]> {
    this.logger.debug('Get All Users');
    return this.read.findAllUsers();
  }

  /**
   * Informationsabfrage zum aktuellen Benutzer.
   *
   * @param ctx GraphQL-Kontext (enthält `req/res` zum Auslesen der Cookies)
   * @param token Optionales Access-Token (Fallback, wenn kein Cookie vorhanden ist)
   * @returns {@link User}
   *
   * @example
   * ```graphql
   * query {
   *   me { id username email }
   * }
   * ```
   */
  @Query(() => User, { name: 'me' })
  @Public()
  async me(
    @Context() ctx: GqlCtx,
    @Args('token', { type: () => String, nullable: true }) token?: string,
  ): Promise<User> {
    this.logger.debug('me');
    const accessFromCookie = readAccessTokenFromCookie(ctx?.req);
    const accessToken = accessFromCookie ?? token ?? undefined;

    if (!accessToken) {
      throw new BadUserInputError('Kein Access-Token gesetzt');
    }

    const user = await this.read.getUserInfo(accessToken);
    if (!user) {
      throw new BadUserInputError('Benutzer nicht gefunden');
    }
    return user;
  }

  /**
   * Holt einen Benutzer per **ID**.
   *
   * @param id Keycloak-UUID
   * @returns {@link User}
   *
   * @example
   * ```graphql
   * query {
   *   getById(id: "0b9d...") { id username email }
   * }
   * ```
   */
  @Query(() => User, { name: 'getById' })
  @Public()
  async getById(@Args('id', { type: () => String }) id: string): Promise<User> {
    this.logger.debug('getById: id=%s', id);
    return this.read.findById(id);
  }
}

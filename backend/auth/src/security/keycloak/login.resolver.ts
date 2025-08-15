import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { BadUserInputError } from './errors.js';
import { KeycloakService, SignIn } from './keycloak.service.js';
import { UseInterceptors } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { CookieOptions, Response } from 'express';
import process from 'node:process';

// @nestjs/graphql fasst die Input-Daten zu einem Typ zusammen
/** Typdefinition für Login-Daten bei GraphQL */
export interface LoginInput {
  /** Benutzername */
  readonly username: string;
  /** Passwort */
  readonly password: string;
}

/** Typdefinition für Refresh-Daten bei GraphQL */
export interface RefreshInput {
  /** Refresh Token */
  readonly refresh_token: string; // eslint-disable-line @typescript-eslint/naming-convention
}

const cookieOpts = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as
    | true
    | false
    | 'strict'
    | 'lax'
    | 'none',
  path: '/',
  maxAge: maxAgeMs,
});

@Resolver('login')
@UseInterceptors(ResponseTimeInterceptor)
export class LoginResolver {
  readonly #keycloakService: KeycloakService;

  readonly #logger = getLogger(LoginResolver.name);

  constructor(keycloakService: KeycloakService) {
    this.#keycloakService = keycloakService;
  }

  @Mutation()
  @Public()
  async login(
    @Args() { username, password }: LoginInput,
    @Context() ctx: { res: Response },
  ) {
    this.#logger.debug('login: username=%s', username);

    const result = await this.#keycloakService.login({
      username,
      password,
    });
    if (result === undefined || result === null) {
      throw new BadUserInputError(
        'Falscher Benutzername oder falsches Passwort',
      );
    }

    // Tokens → Cookies
    ctx.res.cookie(
      'kc_access_token',
      result.access_token,
      cookieOpts(result.expires_in * 1000),
    );
    ctx.res.cookie(
      'kc_refresh_token',
      result.refresh_token,
      cookieOpts(result.refresh_expires_in * 1000),
    );

    return result;
  }

  @Mutation()
  @Public()
  async refresh(@Args() input: RefreshInput) {
    this.#logger.debug('refresh: input=%o', input);
    // eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
    const { refresh_token } = input;

    const result = await this.#keycloakService.refresh(refresh_token);
    if (result === undefined) {
      throw new BadUserInputError('Falscher Token');
    }

    this.#logger.debug('refresh: result=%o', result);
    return result;
  }

  @Mutation()
  // @Roles({ roles: ['ADMIN'] })
  @Public()
  async signIn(@Args('input') input: SignIn) {
    this.#logger.debug('signIn: input=%o', input);

    const result = await this.#keycloakService.signIn(input);
    if (result === undefined) {
      throw new BadUserInputError('Falscher Token');
    }

    this.#logger.debug('signIn: result=%o', result);
    return result;
  }

  // --------- User-Management ---------
  @Mutation('updateUser')
  //@Roles({ roles: ['admin'] })
  @Public()
  async updateUser(
    @Args('userIdOrUsername') userIdOrUsername: string,
    @Args('input')
    input: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    },
  ) {
    const { ...rest } = input ?? {};
    await this.#keycloakService.updateUser(userIdOrUsername, rest);

    return { ok: true };
  }

  @Mutation('setUserPassword')
  @Public()
  async setUserPassword(
    @Args('input')
    input: {
      userIdOrUsername: string;
      newPassword: string;
      temporary?: boolean;
    },
  ): Promise<{ ok: boolean }> {
    await this.#keycloakService.setUserPassword(
      input.userIdOrUsername,
      input.newPassword,
      {
        temporary: input.temporary,
      },
    );
    return { ok: true };
  }

  @Mutation('deleteUser')
  @Public()
  async deleteUser(@Args('userIdOrUsername') userIdOrUsername: string) {
    await this.#keycloakService.deleteUser(userIdOrUsername);

    return { ok: true };
  }

  // --------- Rollen-Management ---------
  @Mutation('assignRealmRole')
  @Public()
  async assignRealmRole(
    @Args('username') username: string,
    @Args('roleName') roleName: 'ADMIN' | 'SECURITY' | 'GUEST',
  ): Promise<{ ok: boolean }> {
    await this.#keycloakService.assignRealmRoleToUsername(username, roleName);
    return { ok: true };
  }

  @Mutation('removeRealmRole')
  @Public()
  async removeRealmRole(
    @Args('username') username: string,
    @Args('roleName') roleName: 'ADMIN' | 'SECURITY' | 'GUEST',
  ): Promise<{ ok: boolean }> {
    await this.#keycloakService.removeRealmRoleFromUser(username, roleName);
    return { ok: true };
  }
}

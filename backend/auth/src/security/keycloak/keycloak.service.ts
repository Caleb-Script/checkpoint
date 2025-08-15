import { keycloakConnectOptions, paths } from '../../config/keycloak.js';
import { getLogger } from '../../logger/logger.js';
import { Injectable } from '@nestjs/common';
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type RawAxiosRequestHeaders,
} from 'axios';
import {
  type KeycloakConnectOptions,
  type KeycloakConnectOptionsFactory,
} from 'nest-keycloak-connect';

const { authServerUrl, clientId, secret } = keycloakConnectOptions;

interface Login {
  readonly username: string | undefined;
  readonly password: string | undefined;
}

export interface SignIn {
  readonly firstName: string;
  readonly lastName: string;
  readonly emailData?: string;
}

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  // Passwort separat hier mit drin – wird über reset-password gesetzt
  password?: string;
};

export type RoleData = {
  id: string;
  name: string;
};

export type Role = 'ADMIN' | 'SECURITY' | 'GUEST';

/** Mapping deines internen Role-Typs → tatsächlicher Rollenname in Keycloak */
const ROLE_NAME_MAP: Record<Role, string> = {
  ADMIN: process.env.KC_ROLE_ADMIN ?? 'ADMIN',
  SECURITY: process.env.KC_ROLE_SECURITY ?? 'SECURITY',
  GUEST: process.env.KC_ROLE_GUEST ?? 'GUEST',
};

type KeycloakUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
};

export type Token = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  id_token: string;
  scope: string;
};

@Injectable()
export class KeycloakService implements KeycloakConnectOptionsFactory {
  readonly #loginHeaders: RawAxiosRequestHeaders;
  readonly #keycloakClient: AxiosInstance;
  readonly #logger = getLogger(KeycloakService.name);

  constructor() {
    const authorization = Buffer.from(`${clientId}:${secret}`, 'utf8').toString(
      'base64',
    );
    this.#loginHeaders = {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    this.#keycloakClient = axios.create({
      baseURL: authServerUrl,
    });
    this.#logger.debug('keycloakClient=%o', this.#keycloakClient.defaults);
  }

  createKeycloakConnectOptions(): KeycloakConnectOptions {
    return keycloakConnectOptions;
  }

  // ================================================= Auth ========================================================================

  async login({ username, password }: Login) {
    this.#logger.debug('login: username=%s', username);
    if (username === undefined || password === undefined) {
      return null;
    }

    const loginBody = `grant_type=password&username=${username}&password=${password}&scope=openid`;
    let response: AxiosResponse<Record<string, number | string>>;
    try {
      response = await this.#keycloakClient.post(paths.accessToken, loginBody, {
        headers: this.#loginHeaders,
      });
    } catch {
      this.#logger.warn('login: Fehler bei %s', paths.accessToken);
      return null;
    }

    this.#logPayload(response);
    return response.data as Token;
  }

  async refresh(refresh_token: string | undefined) {
    this.#logger.debug('refresh: refresh_token=%s', refresh_token);
    if (refresh_token === undefined) {
      return null;
    }

    const refreshBody = `grant_type=refresh_token&refresh_token=${refresh_token}`;
    let response: AxiosResponse<Record<string, number | string>>;
    try {
      response = await this.#keycloakClient.post(
        paths.accessToken,
        refreshBody,
        { headers: this.#loginHeaders },
      );
    } catch {
      this.#logger.warn(
        'refresh: Fehler bei POST-Request: path=%s, body=%o',
        paths.accessToken,
        refreshBody,
      );
      return null;
    }
    this.#logger.debug('refresh: response.data=%o', response.data);
    return response.data;
  }

  // ================================================= User anlegen ======================================================

  async signIn({ firstName, lastName, emailData }: SignIn) {
    this.#logger.debug('signIn: name %s %s', firstName, lastName);

    const { username, email, password } =
      await this.#createUsernameAndEmailAndPassword({
        firstName,
        lastName,
        email: emailData,
      });

    const signInHeaders = {
      Authorization: `Bearer ${await this.#getAdminToken()}`,
      'Content-Type': 'application/json',
    };

    const signInBody = {
      username,
      enabled: true,
      firstName,
      lastName,
      email,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ],
    };

    let response: AxiosResponse<Record<string, number | string>>;
    try {
      response = await this.#keycloakClient.post(paths.users, signInBody, {
        headers: signInHeaders,
      });
    } catch {
      this.#logger.warn('login: Fehler bei %s', paths.accessToken);
      return null;
    }

    this.#logger.debug('User erstellt, Status: %s', response.status);
    return { username, password };
  }

  //
  // =================================== User updaten / Passwort setzen / löschen  ======================================================================

  /**
   * Aktualisiert firstName/lastName/email. `password` wird ignoriert (dafür `setUserPassword`).
   * `userIdOrUsername` kann die UUID ODER der exakte Username sein.
   */
  async updateUser(userIdOrUsername: string, input: UpdateUserInput) {
    this.#logger.debug('update user: %s', userIdOrUsername);
    this.#logger.debug('input: %o', input);

    const adminToken = await this.#getAdminToken();
    const id = await this.#resolveUserId(userIdOrUsername, adminToken);

    // Nur erlaubte Felder übertragen
    const { firstName, lastName, email } = input;
    const payload: Partial<KeycloakUser> = {};
    if (firstName !== undefined) payload.firstName = firstName;
    if (lastName !== undefined) payload.lastName = lastName;
    if (email !== undefined) payload.email = email;

    await this.#keycloakClient.put(
      `${paths.users}/${encodeURIComponent(id)}`,
      payload,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    this.#logger.debug(
      'updateUser: %s (%s) aktualisiert',
      id,
      userIdOrUsername,
    );

    return {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    };
  }

  /**
   * Setzt ein neues Passwort (nicht temporär).
   */
  async setUserPassword(
    userIdOrUsername: string,
    newPassword: string,
    options?: { temporary?: boolean },
  ) {
    const adminToken = await this.#getAdminToken();
    const id = await this.#resolveUserId(userIdOrUsername, adminToken);

    await this.#keycloakClient.put(
      `${paths.users}/${encodeURIComponent(id)}/reset-password`,
      {
        type: 'password',
        value: newPassword,
        temporary: options?.temporary ?? false,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    this.#logger.debug(
      'setUserPassword: Passwort für %s ($s) gesetzt',
      id,
      userIdOrUsername,
    );
  }

  /**
   * Löscht einen User.
   */
  async deleteUser(userIdOrUsername: string): Promise<void> {
    const adminToken = await this.#getAdminToken();
    const id = await this.#resolveUserId(userIdOrUsername, adminToken);

    await this.#keycloakClient.delete(
      `${paths.users}/${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    this.#logger.debug('deleteUser: %s gelöscht', id);
  }

  // ============================================= Realm-Rolle per USERNAME zuweisen/entfernen =============================================

  async assignRealmRoleToUsername(
    username: string,
    roleName: string,
  ): Promise<void> {
    const adminToken = await this.#getAdminToken();

    const user = await this.#findUserByUsername(username, adminToken);
    if (!user?.id) throw new Error(`User '${username}' nicht gefunden.`);

    // schon vorhanden?
    const current = await this.#getUserRealmRoles(user.id, adminToken);
    if (current.some((r) => r.name === roleName)) {
      this.#logger.debug(
        "assignRole: '%s' bereits zugewiesen → %s",
        roleName,
        username,
      );
      return;
    }

    const role = await this.#getRealmRole(roleName, adminToken);
    this.#logger.debug('user roles=%o', role);

    await this.#keycloakClient.post(
      `${paths.users}/${encodeURIComponent(user.id)}/role-mappings/realm`,
      [role],
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    this.#logger.debug("assignRole: '%s' → %s OK", roleName, username);
  }

  async removeRealmRoleFromUser(
    username: string,
    roleName: string,
  ): Promise<void> {
    const adminToken = await this.#getAdminToken();
    const user = await this.#findUserByUsername(username, adminToken);
    if (!user?.id) throw new Error(`User '${username}' nicht gefunden.`);

    const role = await this.#getRealmRole(roleName, adminToken);

    await this.#keycloakClient.delete(
      `${paths.users}/${encodeURIComponent(user.id)}/role-mappings/realm`,
      { headers: { Authorization: `Bearer ${adminToken}` }, data: [role] },
    );

    this.#logger.debug("removeRole: '%s' von %s entfernt", roleName, username);
  }

  // ============================================================================ Utils ============================================================================

  async #getRealmRole(
    roleName: Role | string,
    adminToken: string,
  ): Promise<RoleData> {
    const effective = this.#mapRoleInput(roleName);

    try {
      const { data } = await this.#keycloakClient.get<RoleData>(
        `${paths.roles}/${encodeURIComponent(effective)}`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      if (!data?.id || !data?.name) {
        throw new Error(`Rollenobjekt unvollständig (name='${effective}')`);
      }
      return { id: data.id, name: data.name };
    } catch (e) {
      throw new Error(`Realm-Rolle '${effective}' nicht gefunden.`);
    }
  }

  // Findet einen User per username (exakt) – EXISTIERT BEI DIR SCHON, sonst so:
  async #findUserByUsername(username: string, adminToken: string) {
    const { data } = await this.#keycloakClient.get<any[]>(paths.users, {
      params: { username, exact: true },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return data?.[0];
  }

  async #getUserRealmRoles(
    userId: string,
    adminToken: string,
  ): Promise<RoleData[]> {
    const headers = { Authorization: `Bearer ${adminToken}` };
    const { data } = await this.#keycloakClient.get<RoleData[]>(
      `${paths.users}/${userId}/role-mappings/realm`,
      { headers },
    );
    return data ?? [];
  }

  async #getAdminToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: process.env.KC_ADMIN_USER!,
      password: process.env.KC_ADMIN_PASS!,
    });

    const res = await this.#keycloakClient.post(
      `/realms/master/protocol/openid-connect/token`,
      params.toString(),
      { headers: this.#loginHeaders },
    );

    return res.data.access_token;
  }

  async #createUsernameAndEmailAndPassword({
    firstName,
    lastName,
    email,
  }: {
    firstName: string;
    lastName: string;
    email?: string;
  }) {
    this.#logger.debug('create Username!');
    const base = (lastName.slice(0, 2) + firstName.slice(0, 2))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const username = `${base}${suffix}`;

    if (!email) {
      this.#logger.debug('create Email!');
      email = `${username}@omnixys.com`;
    }

    this.#logger.debug('create Password!');
    const password = Math.random().toString(36).slice(-8);

    return { username, email, password };
  }

  async #resolveUserId(userIdOrUsername: string, adminToken: string) {
    // Wenn es wie eine UUID aussieht, direkt nutzen; sonst per Username suchen
    if (/^[0-9a-fA-F-]{20,}$/.test(userIdOrUsername)) return userIdOrUsername;
    const user = await this.#findUserByUsername(userIdOrUsername, adminToken);
    if (!user?.id)
      throw new Error(`User '${userIdOrUsername}' nicht gefunden.`);
    return user.id;
  }

  #mapRoleInput(input: Role | string): string {
    // Erlaubt sowohl Enum ('ADMIN') als auch freies String-Input ('admin')
    const key = String(input).toUpperCase() as Role;
    return ROLE_NAME_MAP[key] ?? String(input);
  }

  #logPayload(response: AxiosResponse<Record<string, string | number>>) {
    const { access_token } = response.data;
    const [, payloadString] = (access_token as string).split('.');

    if (payloadString === undefined) {
      return;
    }
    const payloadDecoded = atob(payloadString);
    const payload = JSON.parse(payloadDecoded);

    const { exp, realm_access } = payload;
    this.#logger.debug('#logPayload: exp=%s', exp);

    const { roles } = realm_access;
    this.#logger.debug('#logPayload: roles=%o', roles);
  }
}

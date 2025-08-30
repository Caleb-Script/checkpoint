import { keycloakConnectOptions, paths } from '../../config/keycloak.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type RawAxiosRequestHeaders,
} from 'axios';
import {
  type KeycloakConnectOptions,
  type KeycloakConnectOptionsFactory,
} from 'nest-keycloak-connect';
import { BadUserInputError } from './errors.js';
import * as jose from 'jose';
import { LoggerPlus } from '../../logger/logger-plus.js';
import { KafkaConsumerService } from '../../messaging/kafka-consumer.service.js';
import { KafkaProducerService } from '../../messaging/kafka-producer.service.js';
import { getKafkaTopicsBy } from '../../messaging/kafka-topic.properties.js';
import { TraceContextProvider } from '../../trace/trace-context.provider.js';
import { LoggerService } from '../../logger/logger.service.js';
import { trace, Tracer, context as otelContext } from '@opentelemetry/api';
import { handleSpanError } from '../../error.util.js';

const { authServerUrl, clientId, secret } = keycloakConnectOptions;

interface Login {
  readonly username: string | undefined;
  readonly password: string | undefined;
}

export interface SignIn {
  readonly firstName: string;
  readonly lastName: string;
  readonly emailData?: string;
  readonly invitationId: string;
  readonly phone?: string;
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

export interface KeycloakUserInfo {
  sub: string;
  username?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  roles: string[];
  ticketId?: string[];
  invitationId?: string;
}

type RealmPayload = jose.JWTPayload & {
  sub: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  realm_access?: { roles?: string[] };
  ticketId?: string[];
  invitationId?: string;
  iss?: string; // issuer
  azp?: string; // authorized party (client)
};

type UserListPayload = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  attributes: {
    ticketId?: string[];
    invitationId: string[];
  };
};

@Injectable()
export class KeycloakService implements KeycloakConnectOptionsFactory {
  readonly #loginHeaders: RawAxiosRequestHeaders;
  readonly #keycloakClient: AxiosInstance;

  // JWKS Cache pro Issuer (robuster gegen Port/Host-Änderungen)
  #jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

  readonly #kafkaConsumerService: KafkaConsumerService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;

  constructor(
    kafkaConsumerService: KafkaConsumerService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
  ) {
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
    this.#kafkaConsumerService = kafkaConsumerService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(KeycloakService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(KeycloakService.name);
    this.#traceContextProvider = traceContextProvider;
    // this.#logger.debug('keycloakClient=%o', this.#keycloakClient.defaults);
  }

  async onModuleInit(): Promise<void> {
    await this.#kafkaConsumerService.consume({
      topics: getKafkaTopicsBy(['user']),
    });
  }

  createKeycloakConnectOptions(): KeycloakConnectOptions {
    return keycloakConnectOptions;
  }

  async findAllUsers() {
    this.#logger.debug('finde alle User');

    const adminToken = await this.#getAdminToken();

    const res = await this.#keycloakClient.get(`${paths.users}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const users: UserListPayload[] = res.data;

    this.#logger.debug('users=%o', users);
    return users;
  }

  // ================================================= Auth ========================================================================

  async getUserInfo(token: string): Promise<KeycloakUserInfo> {
    const decoded = jose.decodeJwt(token) as RealmPayload;
    this.#logger.debug('decoded=%o', decoded);
    const iss = decoded.iss;
    if (!iss) throw new UnauthorizedException('Missing issuer');

    // Token kryptografisch prüfen (Issuer erzwingen, Audience optional)
    const JWKS = this.#getJwks(iss);
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: iss,
      // audience: this.config.clientId, // optional, wenn du azp/aud erzwingen willst
    });

    const p = payload as RealmPayload;

    return {
      sub: p.sub,
      username: p.preferred_username,
      name: p.name,
      givenName: p.given_name,
      familyName: p.family_name,
      email: p.email,
      roles: p.realm_access?.roles ?? [],
      invitationId: p.invitationId,
      ticketId: p.ticketId ?? [],
    };
  }

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

  async logout(refreshToken: string | undefined) {
    this.#logger.debug('logout: refresh=%s', refreshToken);

    // 1) Keycloak: Refresh-Token invalidieren (Token-Revocation)
    if (refreshToken) {
      const logoutBody = `client_id=${clientId}&refresh_token=${refreshToken}`;

      try {
        await this.#keycloakClient.post(paths.logout, logoutBody, {
          headers: this.#loginHeaders,
        });
      } catch {
        this.#logger.warn(
          'logout: Fehler bei POST-Request: path=%s, body=%o',
          paths.logout,
          logoutBody,
        );
        throw new BadUserInputError('Falscher Token');
      }
    }
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
    return response.data as Token;
  }

  // ================================================= User anlegen ======================================================

  /**
   * 🔥 signUp – erstellt (oder holt) einen Keycloak-User und setzt Attributes inklusive invitationId.
   * - Falls User bereits existiert (username/email), werden Attribute gemerged (mode "append" für Arrays; "set" für einzelne Werte).
   * - invitationId wird als String-Array gespeichert (Keycloak-Konvention).
   */
  async signUp({ invitationId, firstName, lastName, emailData, phone }: SignIn) {
    return await this.#tracer.startActiveSpan('auth.signUp', async (span) => {
      try {
        return await otelContext.with(
          trace.setSpan(otelContext.active(), span),
          async () => {
            this.#logger.debug('signIn: name %s %s', firstName, lastName);

            const adminToken = await this.#getAdminToken();
            let userId;

            // Attribute vorbereiten (merge invitationId hinein)
            const initialAttrs: Record<string, string[]> = {};
            if (invitationId) {
              initialAttrs['invitationId'] = this.#normalizeAttr(invitationId);
            }
            if (phone) {
              initialAttrs['phone'] = this.#normalizeAttr(invitationId);
            }

            const baseUser = {
              username: 'N/A',
              email: emailData,
              firstName: firstName ?? undefined,
              lastName: lastName ?? undefined,
              enabled: true,
              attributes: Object.keys(initialAttrs).length
                ? initialAttrs
                : undefined,
            };

            // Neu anlegen
            const { username, email, password } =
              await this.#createUsernameAndEmailAndPassword({
                firstName,
                lastName,
                email: emailData,
              });

            baseUser.username = username;
            baseUser.email = email;

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

            let res: AxiosResponse<Record<string, number | string>>;
            try {
              res = await this.#keycloakClient.post(paths.users, signInBody, {
                headers: signInHeaders,
              });

              if (res.status === 201 || res.status === 204) {
                // Location-Header enthält id
                const location: string | undefined = res.headers?.location;
                if (location) {
                  userId = location.split('/').pop() || null;
                }
                // Fallback: nachschlagen
                if (!userId) {
                  userId = await this.#findUserByUsername(username, adminToken);
                }
              } else if (res.status === 409) {
                // Conflict → existiert bereits, lookup
                userId = await this.#findUserByUsername(username, adminToken);

                if (!userId)
                  throw new BadRequestException(
                    'User exists but cannot resolve id',
                  );
              } else {
                throw new BadRequestException(
                  `Keycloak user create failed: ${res.status} ${JSON.stringify(res.data)}`,
                );
              }
            } catch {
              this.#logger.warn('login: Fehler bei %s', paths.accessToken);
              return null;
            }

            if (!userId) {
              throw new NotFoundException(
                'User id could not be resolved after signUp',
              );
            }

            await this.addAttribute({
              userId,
              attributes: initialAttrs, // bereits als string[] aufbereitet
              mode: 'append',
            });

            await this.assignRealmRoleToUsername(username, 'GUEST');

            this.#logger.debug(
              `signUp: userId=${userId} created=true attributes=${JSON.stringify(initialAttrs)}`,
            );

            const trace = this.#traceContextProvider.getContext();

            const id = await this.#resolveUserId(username, adminToken);

            this.#kafkaProducerService.addUser(
              {
                userId: id,
                invitationId,
              },
              'auth.signUp',
              trace,
            );

            this.#kafkaProducerService.sendUserCredentials(
              {
                userId: id,
                firstName,
                username,
                password,
                phone,
              },
              'auth.signUp',
              trace,
            );
            this.#logger.debug('User erstellt, Status: %s', res.status);
            this.#logger.debug(
              'new username: %s and password: %s',
              username,
              password,
            );
            return { username, password };
          },
        );
      } catch (error) {
        handleSpanError(span, error, this.#logger, 'addItem');
      } finally {
        span.end();
      }
    });
  }

  //
  // =================================== User updaten / Passwort setzen / löschen  ======================================================================

  /**
   * Fügt/aktualisiert/entfernt Keycloak-User-Attribute.
   * - Identifikation über userId | username | email (mind. eins davon)
   * - mode:
   *   - "set" (default): setzt/überschreibt Werte; leere/null → Attribut löschen
   *   - "append": hängt Werte an bestehende Arrays an (keine Duplikate)
   *   - "remove": entfernt gezielt Werte aus Arrays; bei leer → Attribut löschen
   *
   * Keycloak speichert Attribute als String-Arrays.
   */
  async addAttribute(input: {
    userId?: string;
    attributes: Record<string, unknown>;
    mode?: 'set' | 'append' | 'remove';
  }): Promise<void> {
    this.#logger.debug('addAttribute: input=%o', input);

    if (!input || typeof input !== 'object' || !input.attributes) {
      throw new BadUserInputError('attributes is required');
    }

    const adminToken = await this.#getAdminToken();

    // ---------- User-ID auflösen ----------
    const targetUserId = input.userId?.trim();
    const headers = { Authorization: `Bearer ${adminToken}` };

    if (!targetUserId) {
      throw new BadUserInputError(
        'User not found (provide userId or username or email)',
      );
    }

    // ---------- Vorhandenen User holen ----------
    const { data: user } = await this.#keycloakClient.get(
      `${paths.users}/${encodeURIComponent(targetUserId)}`,
      { headers },
    );

    const current =
      (user?.attributes as Record<string, unknown>) ??
      ({} as Record<string, unknown>);

    const normalize = (v: unknown): string[] => {
      if (v === null || v === undefined) return [];
      if (Array.isArray(v)) return v.map((x) => String(x));
      return [String(v)];
    };

    // aktuelles Attribute-Objekt in string[] mappen
    const updated: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(current)) {
      updated[k] = normalize(v);
    }

    const mode = input.mode ?? 'set';

    // set: invitationId setzen
    // append: mehrere ticketIds anhängen
    // remove: ticketId "tkt_1" entfernen

    if (mode === 'set') {
      for (const [k, v] of Object.entries(input.attributes)) {
        const arr = normalize(v);
        if (!arr.length) delete updated[k];
        else updated[k] = arr;
      }
    } else if (mode === 'append') {
      for (const [k, v] of Object.entries(input.attributes)) {
        const arr = normalize(v);
        if (!arr.length) continue;
        const existing = new Set(updated[k] ?? []);
        for (const s of arr) existing.add(s);
        updated[k] = Array.from(existing);
      }
    } else if (mode === 'remove') {
      for (const [k, v] of Object.entries(input.attributes)) {
        if (v === null || (Array.isArray(v) && v.length === 0)) {
          delete updated[k];
          continue;
        }
        const toRemove = new Set(normalize(v));
        const remaining = (updated[k] ?? []).filter((s) => !toRemove.has(s));
        if (remaining.length) updated[k] = remaining;
        else delete updated[k];
      }
    } else {
      throw new BadUserInputError(`Unsupported mode: ${mode}`);
    }

    const payload = { ...user, attributes: updated };

    await this.#keycloakClient.put(
      `${paths.users}/${encodeURIComponent(targetUserId)}`,
      payload,
      { headers },
    );

    this.#logger.debug(
      'addAttribute: updated attributes for %s -> %o',
      targetUserId,
      updated,
    );
  }

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

  #normalizeAttr(v: unknown): string[] {
    if (v === null || v === undefined) return [];
    if (Array.isArray(v)) return v.map((x) => String(x));
    return [String(v)];
  }

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

  #getJwks(issuer: string) {
    const url = new URL(`${issuer}/protocol/openid-connect/certs`);
    let jwks = this.#jwksCache.get(url.href);
    if (!jwks) {
      jwks = jose.createRemoteJWKSet(url);
      this.#jwksCache.set(url.href, jwks);
    }
    return jwks;
  }
}

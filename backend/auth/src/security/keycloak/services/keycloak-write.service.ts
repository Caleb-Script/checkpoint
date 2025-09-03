// /backend/auth/src/security/keycloak/services/keycloak-write.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { keycloakConnectOptions, paths } from '../../../config/keycloak.js';
import { LoggerService } from '../../../logger/logger.service.js';
import { KafkaProducerService } from '../../../messaging/kafka-producer.service.js';
import { TraceContextProvider } from '../../../trace/trace-context.provider.js';
import type { KeycloakToken } from '../models/dtos/kc-token.dto.js';
import type { KeycloakUser } from '../models/dtos/kc-user.dto.js';
import type { Role } from '../models/enums/role.enum.js';
import type { LogInInput } from '../models/inputs/log-in.input.js';
import type { SignInInput } from '../models/inputs/sign-in.input.js';
import type { UpdateUserInput } from '../models/inputs/update-user.input.js';
import { toToken } from '../models/mappers/token.mapper.js';
import type { TokenPayload } from '../models/payloads/token.payload.js';
import { KeycloakBaseService } from './keycloak-base.service.js';

/**
 * @file Mutierende Operationen gegen Keycloak (Auth-Flows & User-Mutationen).
 *  - login/refresh/logout
 *  - signUp / update / password / delete
 *  - Attribute & Rollen
 *  - Kafka-Events bei signUp
 */
@Injectable()
export class KeycloakWriteService extends KeycloakBaseService {
  constructor(
    logger: LoggerService,
    trace: TraceContextProvider,
    private readonly kafka: KafkaProducerService,
  ) {
    super(logger, trace);
  }

  /**
   * Password-Login (ROPC).
   * @returns TokenPayload oder null (bei invalid_grant)
   */
  async login({
    username,
    password,
  }: LogInInput): Promise<TokenPayload | null> {
    return this.withSpan('auth.login', async () => {
      if (!username || !password) return null;

      const body = new URLSearchParams({
        grant_type: 'password',
        username,
        password,
        scope: 'openid',
      });
      const data = await this.kcRequest<Record<string, string | number>>(
        'post',
        paths.accessToken,
        { data: body.toString(), headers: this.loginHeaders, adminAuth: false },
        { mapTo: 'null-on-401' },
      );
      if (!data) return null;
      return toToken(data as KeycloakToken);
    });
  }

  /**
   * Refresh-Flow.
   */
  async refresh(
    refresh_token: string | undefined,
  ): Promise<TokenPayload | null> {
    return this.withSpan('auth.refresh', async () => {
      if (!refresh_token) return null;

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      });
      const data = await this.kcRequest<Record<string, string | number>>(
        'post',
        paths.accessToken,
        { data: body.toString(), headers: this.loginHeaders, adminAuth: false },
        { mapTo: 'null-on-401' },
      );
      if (!data) return null;
      return toToken(data as KeycloakToken);
    });
  }

  /**
   * Logout (Refresh-Token invalidieren).
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    return this.withSpan('auth.logout', async () => {
      if (!refreshToken) return;
      const body = new URLSearchParams({
        client_id: keycloakConnectOptions.clientId ?? '',
        refresh_token: refreshToken,
      });
      await this.kcRequest('post', paths.logout, {
        data: body.toString(),
        headers: this.loginHeaders,
        adminAuth: false,
      });
    });
  }

  /**
   * User anlegen (mit invitationId/phoneNumber Attributen) + Rolle + Kafka-Events.
   */
  async signUp({
    invitationId,
    firstName,
    lastName,
    emailData,
    phoneNumber,
  }: SignInInput): Promise<{
    userId: string;
    username: string;
    password: string;
  } | null> {
    return this.withSpan('auth.signUp', async () => {
      // Attribute vorbereiten
      const attrs: Record<string, string[]> = {};
      if (invitationId)
        attrs['invitationId'] = this.normalizeAttr(invitationId);
      if (phoneNumber) attrs['phoneNumber'] = this.normalizeAttr(phoneNumber);

      const { username, email, password } =
        await this.createUsernameAndEmailAndPassword({
          firstName,
          lastName,
          email: emailData,
        });

      const body = {
        username,
        enabled: true,
        firstName,
        lastName,
        email,
        credentials: [{ type: 'password', value: password, temporary: false }],
      };

      await this.kcRequest('post', paths.users, {
        data: body,
        headers: await this.adminJsonHeaders(),
      });

      // id ermitteln
      const userId = await this.findUserIdByUsername(username);
      if (!userId)
        throw new NotFoundException(
          'User id could not be resolved after signUp',
        );

      // Attribute mergen
      await this.addAttribute({ userId, attributes: attrs, mode: 'append' });
      // Rolle zuweisen
      await this.assignRealmRoleToUser(userId, 'GUEST');

      const traceCtx = this.traceContext.getContext();
      this.kafka.addUser({ userId, invitationId }, 'auth.signUp', traceCtx);
      this.kafka.sendUserCredentials(
        { userId, firstName, username, password, phoneNumber },
        'auth.signUp',
        traceCtx,
      );

      return { userId, username, password };
    });
  }

  /**
   * Attribute setzen / anhängen / entfernen (string[]-Konvention).
   */
  async addAttribute(input: {
    userId: string;
    attributes: Record<string, unknown>;
    mode?: 'set' | 'append' | 'remove';
  }): Promise<void> {
    const { userId, attributes } = input;
    const mode = input.mode ?? 'set';

    // vorhandene Attribute holen
    const user = await this.kcRequest<KeycloakUser>(
      'get',
      `${paths.users}/${encodeURIComponent(userId)}`,
    );
    const current = (user?.attributes as Record<string, unknown>) ?? {};
    const updated: Record<string, string[]> = {};

    const normalize = (v: unknown): string[] => {
      if (v === null || v === undefined) return [];
      if (Array.isArray(v)) return v.map((x) => String(x));
      return [String(v)];
    };

    for (const [k, v] of Object.entries(current)) updated[k] = normalize(v);

    if (mode === 'set') {
      for (const [k, v] of Object.entries(attributes)) {
        const arr = normalize(v);
        if (!arr.length) delete updated[k];
        else updated[k] = arr;
      }
    } else if (mode === 'append') {
      for (const [k, v] of Object.entries(attributes)) {
        const arr = normalize(v);
        if (!arr.length) continue;
        const s = new Set(updated[k] ?? []);
        for (const x of arr) s.add(x);
        updated[k] = Array.from(s);
      }
    } else if (mode === 'remove') {
      for (const [k, v] of Object.entries(attributes)) {
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
      throw new Error(`Unsupported mode: ${mode}`);
    }

    await this.kcRequest(
      'put',
      `${paths.users}/${encodeURIComponent(userId)}`,
      {
        data: { ...user, attributes: updated },
        headers: await this.adminJsonHeaders(),
      },
    );
  }

  /**
   * Basisdaten aktualisieren (firstName/lastName/email).
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<void> {
    const payload: Partial<KeycloakUser> = {};
    if (input.firstName !== undefined) payload.firstName = input.firstName;
    if (input.lastName !== undefined) payload.lastName = input.lastName;
    if (input.email !== undefined) payload.email = input.email;

    await this.kcRequest('put', `${paths.users}/${encodeURIComponent(id)}`, {
      data: payload,
      headers: await this.adminJsonHeaders(),
    });
  }

  /**
   * Passwort setzen (nicht temporär).
   */
  async setUserPassword(id: string, newPassword: string): Promise<void> {
    await this.kcRequest(
      'put',
      `${paths.users}/${encodeURIComponent(id)}/reset-password`,
      {
        data: { type: 'password', value: newPassword, temporary: false },
        headers: await this.adminJsonHeaders(),
      },
    );
  }

  /**
   * Benutzer löschen.
   */
  async deleteUser(id: string): Promise<void> {
    await this.kcRequest('delete', `${paths.users}/${encodeURIComponent(id)}`);
  }

  /**
   * Realm-Rolle einem User zuweisen.
   */
  async assignRealmRoleToUser(
    userId: string,
    roleName: Role | string,
  ): Promise<void> {
    const current = await this.getUserRealmRoles(userId);
    if (current.some((r) => r.name === this.mapRoleInput(roleName))) return;

    const role = await this.getRealmRole(roleName);
    await this.kcRequest(
      'post',
      `${paths.users}/${encodeURIComponent(userId)}/role-mappings/realm`,
      { data: [role] },
    );
  }

  /**
   * Realm-Rolle von User entfernen.
   */
  async removeRealmRoleFromUser(
    userId: string,
    roleName: Role | string,
  ): Promise<void> {
    const role = await this.getRealmRole(roleName);
    await this.kcRequest(
      'delete',
      `${paths.users}/${encodeURIComponent(userId)}/role-mappings/realm`,
      { data: [role] },
    );
  }

  // ---------- Helpers (nur für Write-Service) ----------

  private normalizeAttr(v: unknown): string[] {
    if (v === null || v === undefined) return [];
    if (Array.isArray(v)) return v.map((x) => String(x));
    return [String(v)];
  }

  private async createUsernameAndEmailAndPassword(input: {
    firstName: string;
    lastName: string;
    email?: string;
  }): Promise<{ username: string; email: string; password: string }> {
    const base = (input.lastName.slice(0, 2) + input.firstName.slice(0, 2))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const username = `${base}${suffix}`;
    const email = input.email ?? `${username}@omnixys.com`;
    const password = Math.random().toString(36).slice(-8);
    return { username, email, password };
  }
}

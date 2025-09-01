// /backend/auth/src/security/keycloak/services/keycloak-base.service.ts
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  RawAxiosRequestHeaders,
} from 'axios';
import axios from 'axios';
import * as jose from 'jose';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { context as otelContext, trace, Tracer } from '@opentelemetry/api';
import { keycloakConnectOptions, paths } from '../../../config/keycloak.js';
import type { LoggerPlus } from '../../../logger/logger-plus.js';
import { LoggerService } from '../../../logger/logger.service.js';
import { TraceContextProvider } from '../../../trace/trace-context.provider.js';
import type { Role, RoleData } from '../models/enums/role.enum.js';
import { ROLE_NAME_MAP } from '../models/enums/role.enum.js';

/**
 * @file Gemeinsame Basisklasse für Keycloak-Read/Write-Services:
 *  - Einheitlicher Axios-Request mit Admin-Auth & Fehler-Mapping
 *  - Admin-Token-Caching (mit Ablauf-Puffer)
 *  - JWKS-Caching und JWT-Verify-Helfer
 *  - OTel-Span-Helfer
 *  - Hilfsfunktionen (z. B. Rollen auflösen)
 *
 *  Keine Business-Methoden – nur shared Infrastruktur.
 */
export abstract class KeycloakBaseService {
  /** HTTP-Client auf Keycloak-BaseURL */
  protected readonly kc: AxiosInstance;
  /** Basic-Auth Header für /token|/logout etc. */
  protected readonly loginHeaders: RawAxiosRequestHeaders;

  protected readonly tracer: Tracer;
  protected readonly logger: LoggerPlus;
  protected readonly traceContext: TraceContextProvider;

  /** JWKS-Cache pro Issuer */
  #jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();
  /** Admin-Token Cache (Token + Ablaufzeitpunkt, ms) */
  #adminToken?: { token: string; expiresAt: number };

  protected constructor(
    protected readonly loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
  ) {
    const { authServerUrl, clientId, secret } = keycloakConnectOptions;

    // Basic Auth für client credentials / logout / refresh
    const authorization = Buffer.from(`${clientId}:${secret}`, 'utf8').toString(
      'base64',
    );
    this.loginHeaders = {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    this.kc = axios.create({ baseURL: authServerUrl });

    this.tracer = trace.getTracer(this.constructor.name);
    this.logger = this.loggerService.getLogger(this.constructor.name);
    this.traceContext = traceContextProvider;
  }

  /**
   * Einheitlicher KC-Request (GET/POST/PUT/DELETE) mit optionaler Admin-Auth und sauberem Fehlermapping.
   *
   * @param method HTTP-Methode
   * @param url Pfad relativ zur Keycloak-BaseURL (z. B. `paths.users`)
   * @param cfg Axios-Konfiguration (params, data, headers, adminAuth)
   * @param behavior Fehler-Mapping (z. B. `null-on-401` für Login/Refresh)
   */
  protected async kcRequest<T = unknown>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    cfg: {
      params?: Record<string, unknown>;
      data?: unknown;
      headers?: RawAxiosRequestHeaders;
      adminAuth?: boolean; // true = Authorization: Bearer <admin>
    } = {},
    behavior: { mapTo?: 'null-on-401' | 'throw-on-error' } = {
      mapTo: 'throw-on-error',
    },
  ): Promise<T> {
    const headers: RawAxiosRequestHeaders = { ...cfg.headers };

    if (cfg.adminAuth !== false) {
      const token = await this.getAdminToken();
      headers.Authorization = `Bearer ${token}`;
    }

    const request: AxiosRequestConfig = {
      method,
      url,
      params: cfg.params,
      data: cfg.data,
      headers,
    };

    try {
      const res = await this.kc.request<T>(request);
      return res.data as T;
    } catch (err) {
      const ax = err as AxiosError;
      const status = ax.response?.status ?? 500;

      if (
        behavior.mapTo === 'null-on-401' &&
        (status === 400 || status === 401)
      ) {
        this.logger.warn(
          '%s %s -> %s %o',
          method.toUpperCase(),
          url,
          status,
          ax.response?.data,
        );
        return null as T;
      }

      const body = ax.response?.data;
      const msg =
        typeof body === 'string'
          ? body
          : body && typeof body === 'object'
            ? JSON.stringify(body)
            : ax.message;

      if (status === 401) throw new UnauthorizedException(msg);
      if (status === 404) throw new NotFoundException(msg);
      if (status >= 400 && status < 500) throw new BadRequestException(msg);

      throw new Error(
        `Keycloak request failed: ${method.toUpperCase()} ${url} -> ${status} ${msg}`,
      );
    }
  }

  /**
   * JWT verifizieren (lädt/ cached JWKS pro Issuer).
   * @param token Access-Token
   * @param issuer Erwarteter Issuer
   */
  protected async verifyJwt<T extends object>(
    token: string,
    issuer: string,
  ): Promise<T> {
    const JWKS = this.getJwks(issuer);
    const { payload } = await jose.jwtVerify(token, JWKS, { issuer });
    return payload as T;
  }

  /**
   * Admin-Token holen (mit 30s Ablaufpuffer).
   */
  protected async getAdminToken(): Promise<string> {
    const now = Date.now();
    if (this.#adminToken && this.#adminToken.expiresAt > now)
      return this.#adminToken.token;

    const username = process.env.KC_ADMIN_USER;
    const password = process.env.KC_ADMIN_PASS;
    if (!username || !password)
      throw new UnauthorizedException('KC_ADMIN_USER / KC_ADMIN_PASS fehlen');

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username,
      password,
    });

    const res = await this.kc.post<{
      access_token: string;
      expires_in: number;
    }>(`/realms/master/protocol/openid-connect/token`, params.toString(), {
      headers: this.loginHeaders,
    });

    const token = res.data.access_token;
    const expiresIn = Number(res.data.expires_in ?? 60);
    this.#adminToken = {
      token,
      expiresAt: Date.now() + Math.max(1, expiresIn - 30) * 1000,
    };
    return token;
  }

  /**
   * Admin JSON-Header (Bearer + Content-Type).
   */
  protected async adminJsonHeaders(): Promise<RawAxiosRequestHeaders> {
    return {
      Authorization: `Bearer ${await this.getAdminToken()}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Realm-Rolle laden und validieren.
   */
  protected async getRealmRole(roleName: Role | string): Promise<RoleData> {
    const effective = this.mapRoleInput(roleName);
    try {
      const role = await this.kc.get<RoleData>(
        `${paths.roles}/${encodeURIComponent(effective)}`,
        {
          headers: await this.adminJsonHeaders(),
        },
      );
      const data = role.data;
      if (!data?.id || !data?.name)
        throw new Error(`Rollenobjekt unvollständig (name='${effective}')`);
      return { id: data.id, name: data.name };
    } catch {
      throw new NotFoundException(`Realm-Rolle '${effective}' nicht gefunden.`);
    }
  }

  /**
   * User-Rollen (Realm) laden.
   */
  protected async getUserRealmRoles(userId: string): Promise<RoleData[]> {
    const { data } = await this.kc.get<RoleData[]>(
      `${paths.users}/${encodeURIComponent(userId)}/role-mappings/realm`,
      { headers: await this.adminJsonHeaders() },
    );
    return data ?? [];
  }

  /**
   * Username → userId auflösen.
   */
  protected async findUserIdByUsername(
    username: string,
  ): Promise<string | null> {
    const data = await this.kcRequest<{ id?: string }[]>('get', paths.users, {
      params: { username, exact: true },
    });
    return data?.[0]?.id ?? null;
  }

  /**
   * Enum ('ADMIN') **oder** freier String ('admin') nach Keycloak-Rollenname mappen.
   */
  protected mapRoleInput(input: Role | string): string {
    const key = String(input).toUpperCase() as Role;
    return ROLE_NAME_MAP[key] ?? String(input);
  }

  /**
   * OTel-Span Helper.
   */
  protected async withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const span = this.tracer.startSpan(name);
    try {
      return await otelContext.with(
        trace.setSpan(otelContext.active(), span),
        fn,
      );
    } catch (err) {
      // hier optional zusätzliche Span-Attribute oder handleSpanError(...)
      this.logger.error('%s failed: %s', name, (err as Error).message);
      throw err;
    } finally {
      span.end();
    }
  }

  private getJwks(issuer: string) {
    const url = new URL(`${issuer}/protocol/openid-connect/certs`);
    const key = url.href;
    let jwks = this.#jwksCache.get(key);
    if (!jwks) {
      jwks = jose.createRemoteJWKSet(url);
      this.#jwksCache.set(key, jwks);
    }
    return jwks;
  }
}

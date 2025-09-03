/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/consistent-type-imports */

import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RedisLockService } from '../../redis/redis-lock.service.js';
import { SECURITY } from '../../config/security.config.js';

import { ScanInput } from '../models/inputs/scan.input.js';
import { ScanPayload } from '../models/payload/scan.payload.js';
import { ScanVerdict } from '../models/enums/scan-verdict.enum.js';
import { ShareGuardWriteService } from '../../guard/services/share-guard-write.service.js';
import { PresenceState } from '../models/enums/presenceState.enum.js';
import { Ticket } from '../../ticket/models/entity/ticket.entity.js';
import { GuardVerdict } from '../../guard/models/enums/guard-verdict.enum.js';
import { TokenService } from '../../token/services/token.service.js';
import { ScanLog } from '../models/entitys/scan-log.entity.js';

/**
 * Zusätzliche Reason-Codes, WARUM ein Scan geblockt wurde.
 * Diese Codes sind stabil und können im Frontend/Monitoring ausgewertet werden.
 */
export enum ScanBlockReason {
  REVOKED = 'REVOKED',
  BLOCKED_GLOBAL = 'BLOCKED_GLOBAL',
  GUARD_POLICY_BLOCK = 'GUARD_POLICY_BLOCK',
  ALREADY_INSIDE = 'ALREADY_INSIDE',
  ALREADY_OUTSIDE = 'ALREADY_OUTSIDE',
  COOLDOWN = 'COOLDOWN',
  LOCK_BUSY = 'LOCK_BUSY',
}

/**
 * Prisma-Teil-Interfaces, um any zu vermeiden.
 */
interface TicketRepository {
  findUnique(args: { where: { id: string } }): Promise<Ticket | null>;
  findFirst(args: {
    where: { deviceBoundKey: string };
  }): Promise<Ticket | null>;
  update(args: {
    where: { id: string };
    data: { currentState: PresenceState };
  }): Promise<Ticket>;
}

interface ScanLogCreateData {
  ticketId: string;
  eventId: string;
  byUserId?: string;
  direction: PresenceState;
  verdict: ScanVerdict;
  gate?: string;
  deviceHash?: string;
}

interface ScanLogRepository {
  create(args: { data: ScanLogCreateData }): Promise<ScanLog>; // <-- liefert jetzt ScanLog, nicht Record
}

/**
 * Erweiterte Payload mit Diagnosefeldern.
 */
type RichScanPayload = ScanPayload & {
  reasonCode?: ScanBlockReason;
  guardVerdict?: GuardVerdict;
  cooldownMs?: number;
  lockBusy?: boolean;
};

/**
 * Kontext, der in JEDEM Log mitgegeben wird (strukturierte Logs).
 */
type LogCtx = {
  ticketId?: string;
  eventId?: string;
  byUserId?: string | null;
  direction?: PresenceState;
  gate?: string;
  deviceHash?: string;
  verdict?: ScanVerdict;
  reasonCode?: ScanBlockReason;
  guardVerdict?: GuardVerdict;
};

@Injectable()
export class ScanWriteService {
  private readonly logger = new Logger(ScanWriteService.name);

  readonly #prismaService: PrismaService;
  readonly #shareGuardWriteService: ShareGuardWriteService;
  readonly #redisService: RedisService;
  readonly #redisLockService: RedisLockService;
  readonly #tokenService: TokenService;

  constructor(
    prismaService: PrismaService,
    shareGuardWriteService: ShareGuardWriteService,
    redisService: RedisService,
    redisLockService: RedisLockService,
    tokenService: TokenService,
  ) {
    this.#prismaService = prismaService;
    this.#shareGuardWriteService = shareGuardWriteService;
    this.#redisService = redisService;
    this.#redisLockService = redisLockService;
    this.#tokenService = tokenService;
  }

  // ---------------------------------------------------------------------------
  // Hilfen
  // ---------------------------------------------------------------------------

  private prismaTicket(): TicketRepository {
    return (this.#prismaService as unknown as { ticket: TicketRepository })
      .ticket;
  }

  private prismaScanLog(): ScanLogRepository {
    return (this.#prismaService as unknown as { scanLog: ScanLogRepository })
      .scanLog;
  }

  private log(
    level: 'debug' | 'log' | 'warn' | 'error',
    message: string,
    ctx: LogCtx = {},
  ) {
    // als JSON-String ausgeben, damit strukturierte Logsammler es parsen können
    const payload = JSON.stringify({ msg: message, ...ctx });
    switch (level) {
      case 'debug':
        this.logger.debug(payload);
        break;
      case 'log':
        this.logger.log(payload);
        break;
      case 'warn':
        this.logger.warn(payload);
        break;
      case 'error':
        this.logger.error(payload);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Token → Ticket (plain & QR-JWT)
  // ---------------------------------------------------------------------------

  /**
   * Validiert einen einfachen String-Token & lädt ggf. Ticket.
   *
   * @remarks
   * Minimalistische Token-Regel (ohne externe Dependencies):
   * - `ticket:<id>` → lädt Ticket per ID
   * - sonst: `deviceBoundKey === token`
   */
  async validateToken(token: string): Promise<Ticket | null> {
    if (!token) return null;
    const ticketRepo = this.prismaTicket();

    if (token.startsWith('ticket:')) {
      const id = token.slice('ticket:'.length);
      return await ticketRepo.findUnique({ where: { id } });
    }

    return await ticketRepo.findFirst({ where: { deviceBoundKey: token } });
  }

  /**
   * Verifiziert ein QR-JWT (Signatur, `exp`, `jti`) und lädt das zugehörige Ticket.
   *
   * @throws UnauthorizedException wenn Token fehlt/ungültig
   * @throws NotFoundException wenn Ticket nicht existiert
   */
  private async verifyQrTokenAndLoad(token: string): Promise<Ticket> {
    if (!token) throw new UnauthorizedException('Missing token');

    const payload = await this.#tokenService.verifyTicketJwt(token);
    const id = (payload as Record<string, unknown>)['tid'];
    if (typeof id !== 'string' || !id) {
      throw new UnauthorizedException('Invalid token');
    }

    const ticket = await this.prismaTicket().findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return ticket;
  }

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------

  /**
   * QR-JWT Scan-Entry-Point für Scanner. Optional `direction`, sonst Toggle.
   */
  async scanWithToken(
    token: string,
    options: {
      direction?: PresenceState;
      gate?: string;
      deviceHash?: string;
      byUserId?: string;
    } = {},
  ): Promise<RichScanPayload> {
    const ticket = await this.verifyQrTokenAndLoad(token);
    const direction =
      options.direction ??
      (ticket.currentState === PresenceState.OUTSIDE
        ? PresenceState.INSIDE
        : PresenceState.OUTSIDE);

    this.log('debug', 'scanWithToken: resolved direction', {
      ticketId: ticket.id,
      eventId: ticket.eventId,
      direction,
      gate: options.gate,
      deviceHash: options.deviceHash,
      byUserId: options.byUserId ?? null,
    });

    return await this.scan({
      ticketId: ticket.id,
      direction,
      gate: options.gate ?? 'GATE',
      deviceHash: options.deviceHash,
      byUserId: options.byUserId ?? undefined,
    });
  }

  /**
   * Klassischer Scan mit Ticket-ID (Kompatibilitätspfad).
   */
  async scan(params: ScanInput): Promise<RichScanPayload> {
    const { ticketId, direction, gate, deviceHash, byUserId = null } = params;

    const ticketRepo = this.prismaTicket();
    const scanLogRepo = this.prismaScanLog();

    const ticketRow = await ticketRepo.findUnique({ where: { id: ticketId } });
    if (!ticketRow) {
      this.log('warn', 'Ticket not found', { ticketId });
      throw new NotFoundException('Ticket not found');
    }
    const ticket = ticketRow;

    // 1) Revoked?
    if (ticket.revoked) {
      const verdict = ScanVerdict.REVOKED;
      const reasonCode = ScanBlockReason.REVOKED;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: verdict,
      });

      this.log('warn', 'Scan blocked: ticket revoked', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return { verdict, ticket, log, reasonCode };
    }

    // 2) Globale Blockade?
    const { blocked } = await this.#shareGuardWriteService.isBlocked(ticketId);
    if (blocked) {
      const verdict = ScanVerdict.BLOCKED;
      const reasonCode = ScanBlockReason.BLOCKED_GLOBAL;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.BLOCKED,
      });

      this.log('warn', 'Scan blocked: global block', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return { verdict, ticket, log, reasonCode };
    }

    // 3) ShareGuard-Policy
    const guardVerdict: GuardVerdict =
      await this.#shareGuardWriteService.evaluate({
        ticketId,
        currentState: ticket.currentState as PresenceState,
        incomingDeviceHash: deviceHash,
        gate,
        now: new Date(),
      });

    if (guardVerdict !== GuardVerdict.ALLOW) {
      const verdict = ScanVerdict.BLOCKED;
      const reasonCode = ScanBlockReason.GUARD_POLICY_BLOCK;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: guardVerdict,
      });

      this.log('warn', 'Scan blocked: guard policy', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
        guardVerdict,
      });

      return { verdict, ticket, log, reasonCode, guardVerdict };
    }

    // 4) Doppel-Scan gleicher Richtung?
    if (
      direction === PresenceState.INSIDE &&
      ticket.currentState === PresenceState.INSIDE
    ) {
      const verdict = ScanVerdict.ALREADY_INSIDE;
      const reasonCode = ScanBlockReason.ALREADY_INSIDE;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.ALREADY_INSIDE,
      });

      this.log('debug', 'Scan blocked: already inside', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return { verdict, ticket, log, reasonCode };
    }

    if (
      direction === PresenceState.OUTSIDE &&
      ticket.currentState === PresenceState.OUTSIDE
    ) {
      const verdict = ScanVerdict.ALREADY_OUTSIDE;
      const reasonCode = ScanBlockReason.ALREADY_OUTSIDE;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.ALREADY_OUTSIDE,
      });

      this.log('debug', 'Scan blocked: already outside', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return { verdict, ticket, log, reasonCode };
    }

    // 5) Cooldown (Bounce-Schutz)
    const cdKey = SECURITY.redis.cooldownPrefix + ticketId;
    const inCooldown = await this.#redisService.raw.get(cdKey);
    if (inCooldown) {
      const verdict = ScanVerdict.BLOCKED;
      const reasonCode = ScanBlockReason.COOLDOWN;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: 'COOLDOWN',
      });

      this.log('warn', 'Scan blocked: cooldown active', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return {
        verdict,
        ticket,
        log,
        reasonCode,
        cooldownMs: SECURITY.toggleCooldownMs,
      };
    }

    // 6) Lock (Race-Schutz)
    const lockToken = await this.#redisLockService.acquireTicketLock(
      ticketId,
      2000,
    );
    if (!lockToken) {
      const verdict = ScanVerdict.BLOCKED;
      const reasonCode = ScanBlockReason.LOCK_BUSY;

      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: ticket.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: 'LOCK_BUSY',
      });

      this.log('warn', 'Scan blocked: ticket lock busy', {
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
        reasonCode,
      });

      return { verdict, ticket, log, reasonCode, lockBusy: true };
    }

    // 7) State Toggle
    try {
      const updated = await ticketRepo.update({
        where: { id: ticketId },
        data: { currentState: direction },
      });

      // Cooldown setzen
      await this.#redisService.raw.set(
        cdKey,
        '1',
        'PX',
        SECURITY.toggleCooldownMs,
      );

      const verdict = ScanVerdict.OK;
      const log = await scanLogRepo.create({
        data: {
          ticketId,
          eventId: updated.eventId,
          byUserId: byUserId ?? undefined,
          direction,
          verdict,
          gate,
          deviceHash: deviceHash ?? undefined,
        },
      });

      await this.#shareGuardWriteService.reset(ticketId);

      this.log('log', 'Scan OK', {
        ticketId,
        eventId: updated.eventId,
        byUserId,
        direction,
        gate,
        deviceHash,
        verdict,
      });

      return { verdict, ticket: updated, log };
    } finally {
      await this.#redisLockService.releaseTicketLock(ticketId, lockToken);
    }
  }
}

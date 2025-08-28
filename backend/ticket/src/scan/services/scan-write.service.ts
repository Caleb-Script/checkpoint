/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

  /**
   * Nimmt einen generierten Token entgegen und liefert das Ticket.
   * Token-Regel minimalistisch, ohne externe Dependencies:
   * - "ticket:<id>" → Ticket per ID
   * - sonst: deviceBoundKey === token
   */
  async validateToken(token: string) {
    if (!token) return null;
    if (token.startsWith('ticket:')) {
      const id = token.slice('ticket:'.length);
      return await (this.#prismaService as any).ticket.findUnique({
        where: { id },
      });
    }
    return await (this.#prismaService as any).ticket.findFirst({
      where: { deviceBoundKey: token },
    });
  }

  // --- QR-TOKEN Support ------------------------------------------------------
  /**
   * Öffentliche Methode für Scanner, die ein QR-JWT liefern.
   * Optional kann direction angegeben werden, sonst wird getoggelt.
   */
  async scanWithToken(
    token: string,
    options: {
      direction?: PresenceState;
      gate?: string;
      deviceHash?: string;
      byUserId?: string;
    } = {},
  ) {
    const ticket = await this.#verifyQrTokenAndLoad(token);
    const direction =
      options.direction ??
      (ticket.currentState === PresenceState.OUTSIDE
        ? PresenceState.INSIDE
        : PresenceState.OUTSIDE);
    return this.scan({
      ticketId: ticket.id,
      direction,
      gate: options.gate ?? 'GATE',
      deviceHash: options.deviceHash,
      byUserId: options.byUserId,
    });
  }

  // --- Klassischer Scan mit Ticket-ID (beibehalten für Kompatibilität) ------

  async scan(params: ScanInput): Promise<ScanPayload> {
    const { ticketId, direction, gate, deviceHash, byUserId = null } = params;

    const ticketRow = await this.#prismaService.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticketRow) throw new NotFoundException('Ticket not found');
    const ticket = ticketRow as unknown as Ticket;

    // Revoked?
    if (ticket.revoked) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.REVOKED,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.REVOKED,
      });
      return { verdict: ScanVerdict.REVOKED, ticket, log };
    }

    // Globale Blockade?
    const { blocked } = await this.#shareGuardWriteService.isBlocked(ticketId);
    if (blocked) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.BLOCKED,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.BLOCKED,
      });
      return { verdict: ScanVerdict.BLOCKED, ticket, log };
    }

    // ShareGuard-Policy (Device-Mismatch, Doppel-Scan, Flip-Flop)
    const guardVerdict: GuardVerdict =
      await this.#shareGuardWriteService.evaluate({
        ticketId,
        currentState: ticket.currentState as PresenceState,
        incomingDeviceHash: deviceHash,
        gate,
        now: new Date(),
      });
    if (guardVerdict !== GuardVerdict.ALLOW) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.BLOCKED,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: guardVerdict,
      });
      return { verdict: ScanVerdict.BLOCKED, ticket, log };
    }

    // Doppel-Scan gleicher Richtung?
    if (
      direction === PresenceState.INSIDE &&
      ticket.currentState === PresenceState.INSIDE
    ) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.ALREADY_INSIDE,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.ALREADY_INSIDE,
      });
      return { verdict: ScanVerdict.ALREADY_INSIDE, ticket, log };
    }
    if (
      direction === PresenceState.OUTSIDE &&
      ticket.currentState === PresenceState.OUTSIDE
    ) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.ALREADY_OUTSIDE,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: ScanVerdict.ALREADY_OUTSIDE,
      });
      return { verdict: ScanVerdict.ALREADY_OUTSIDE, ticket, log };
    }

    // Cooldown prüfen (Bounce-Schutz)
    const cdKey = SECURITY.redis.cooldownPrefix + ticketId;
    const inCooldown = await this.#redisService.raw.get(cdKey);
    if (inCooldown) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.BLOCKED,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: 'COOLDOWN',
      });
      return { verdict: ScanVerdict.BLOCKED, ticket, log };
    }

    // Lock holen (Race-Schutz)
    const lockToken = await this.#redisLockService.acquireTicketLock(
      ticketId,
      2000,
    );
    if (!lockToken) {
      const log = await this.#writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.BLOCKED,
        gate,
        deviceHash,
      });
      await this.#shareGuardWriteService.registerFail({
        ticketId,
        reason: 'LOCK_BUSY',
      });
      return { verdict: ScanVerdict.BLOCKED, ticket, log };
    }

    try {
      // Zustand wechseln
      const updatedRow = await this.#prismaService.ticket.update({
        where: { id: ticketId },
        data: { currentState: direction },
      });
      const updated = updatedRow as unknown as Ticket;

      // Cooldown setzen
      await this.#redisService.raw.set(
        cdKey,
        '1',
        'PX',
        SECURITY.toggleCooldownMs,
      );

      const log = await this.#writeLog({
        ticketId,
        eventId: updated.eventId,
        byUserId,
        direction,
        verdict: ScanVerdict.OK,
        gate,
        deviceHash,
      });

      await this.#shareGuardWriteService.reset(ticketId);

      return { verdict: ScanVerdict.OK, ticket: updated, log };
    } finally {
      await this.#redisLockService.releaseTicketLock(ticketId, lockToken);
    }
  }

  /**
   * Verifiziert QR-JWT (Signatur, exp, jti) & lädt Ticket.
   */
  async #verifyQrTokenAndLoad(token: string): Promise<Ticket> {
    if (!token) throw new UnauthorizedException('Missing token');
    const payload = await this.#tokenService.verifyTicketJwt(token);
    const id = payload.tid;
    if (!id) throw new UnauthorizedException('Invalid token');
    const ticket = await this.#prismaService.ticket.findUnique({
      where: { id },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket as Ticket;
  }

  async #writeLog(input: {
    ticketId: string;
    eventId: string;
    byUserId: string | null;
    direction: PresenceState;
    verdict: ScanVerdict;
    gate?: string;
    deviceHash?: string;
  }) {
    return await (this.#prismaService as any).scanLog.create({
      data: {
        ticketId: input.ticketId,
        eventId: input.eventId,
        byUserId: input.byUserId ?? undefined,
        direction: input.direction,
        verdict: input.verdict,
        gate: input.gate,
        deviceHash: input.deviceHash ?? undefined,
      },
    });
  }
}

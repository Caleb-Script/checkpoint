/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ShareGuardService } from './share-guard.service.js';
import { Ticket } from '../models/entity/ticket.entity.js';
import { ScanLog } from '../models/entity/scan-log.entity.js';
import { PresenceState } from '../models/enums/presenceState.enum.js';

export type ScanVerdict =
  | 'OK'
  | 'REVOKED'
  | 'BLOCKED'
  | 'ALREADY_INSIDE'
  | 'ALREADY_OUTSIDE';

export interface ScanParams {
  ticketId: string;
  direction: PresenceState;
  gate: string;
  deviceHash?: string;
  byUserId?: string | null; // Security-User, optional
}

export interface ScanResult {
  verdict: ScanVerdict;
  ticket: Ticket;
  log: ScanLog;
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  readonly #prismaService: PrismaService;
  readonly #shareGuardService: ShareGuardService;

  constructor(
    prismaService: PrismaService,
    shareGueardService: ShareGuardService,
  ) {
    this.#prismaService = prismaService;
    this.#shareGuardService = shareGueardService;
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

  async scan(params: ScanParams): Promise<ScanResult> {
    const { ticketId, direction, gate, deviceHash, byUserId = null } = params;

    const ticket = await await (this.#prismaService as any).ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Revoked?
    if (ticket.revoked) {
      const log = await this.writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: 'REVOKED',
        gate,
        deviceHash,
      });
      await this.#shareGuardService.registerFail({
        ticketId,
        reason: 'REVOKED',
      });
      return { verdict: 'REVOKED', ticket, log };
    }

    // Blocked?
    const { blocked } = await this.#shareGuardService.isBlocked(ticketId);
    if (blocked) {
      const log = await this.writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: 'BLOCKED',
        gate,
        deviceHash,
      });
      await this.#shareGuardService.registerFail({
        ticketId,
        reason: 'Blocked',
      });
      return { verdict: 'BLOCKED', ticket, log };
    }

    // Doppel-Scan gleicher Richtung?
    if (
      direction === PresenceState.INSIDE &&
      ticket.currentState === PresenceState.INSIDE
    ) {
      const log = await this.writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: 'ALREADY_INSIDE',
        gate,
        deviceHash,
      });
      await this.#shareGuardService.registerFail({
        ticketId,
        reason: 'ALREADY_INSIDE',
      });
      return { verdict: 'ALREADY_INSIDE', ticket, log };
    }
    if (
      direction === PresenceState.OUTSIDE &&
      ticket.currentState === PresenceState.OUTSIDE
    ) {
      const log = await this.writeLog({
        ticketId,
        eventId: ticket.eventId,
        byUserId,
        direction,
        verdict: 'ALREADY_OUTSIDE',
        gate,
        deviceHash,
      });
      await this.#shareGuardService.registerFail({
        ticketId,
        reason: 'ALREADY_OUTSIDE',
      });
      return { verdict: 'ALREADY_OUTSIDE', ticket, log };
    }

    // Erfolgreicher Scan → Zustand setzen, Log schreiben, ShareGuard resetten
    const updated = await await (this.#prismaService as any).ticket.update({
      where: { id: ticketId },
      data: { currentState: direction },
    });

    const log = await this.writeLog({
      ticketId,
      eventId: updated.eventId,
      byUserId,
      direction,
      verdict: 'OK',
      gate,
      deviceHash,
    });

    await this.#shareGuardService.reset(ticketId);

    return { verdict: 'OK', ticket: updated, log };
  }

  async getHistory(ticketId: string) {
    return await (this.#prismaService as any).scanLog.findMany({
      where: { ticketId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getScanLogs(ticketId: string) {
    return (this.#prismaService as any).scanLog.findMany({
      where: { ticketId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  // --- intern ---

  private async writeLog(input: {
    ticketId: string;
    eventId: string;
    byUserId: string | null;
    direction: PresenceState;
    verdict: ScanVerdict;
    gate: string;
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

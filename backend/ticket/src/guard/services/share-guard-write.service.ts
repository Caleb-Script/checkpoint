/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SECURITY } from '../../config/security.config.js';
import { GuardEvalInput } from '../models/inputs/guard-eval.input.js';
import { GuardVerdict } from '../models/enums/guard-verdict.enum.js';
import { RegisterFailPayload } from '../models/payloads/register-fail.payload.js';
import { ScanLog } from '../../scan/models/entitys/scan-log.entity.js';

/**
 * Einfache Anti-Sharing Sperrlogik:
 * - failCount inkrementieren
 * - blockedUntil = now + min(BASE * 2^(failCount-1), MAX)
 */
const BASE_BLOCK_SECONDS = 30;
const MAX_BLOCK_SECONDS = 10 * 60; // 10 Minuten

@Injectable()
export class ShareGuardWriteService {
  readonly #prismaService: PrismaService;

  constructor(prisma: PrismaService) {
    this.#prismaService = prisma;
  }

  async reset(ticketId: string) {
    return (this.#prismaService as any).shareGuard.upsert({
      where: { ticketId },
      update: {
        failCount: 0,
        blockedUntil: null,
        reason: null,
        lastFailAt: null,
      },
      create: { ticketId },
    });
  }

  async blockTemporarily(
    ticketId: string,
    ms: number,
    reason: string,
  ): Promise<void> {
    const until = new Date(Date.now() + ms);
    await (this.#prismaService as any).shareGuard.upsert({
      where: { ticketId },
      update: { blockedUntil: until, reason },
      create: { ticketId, blockedUntil: until, reason, failCount: 1 },
    });
  }

  async #ensure(ticketId: string) {
    return (this.#prismaService as any).shareGuard.upsert({
      where: { ticketId },
      update: {},
      create: { ticketId },
    });
  }

  async registerFail({ ticketId, reason }: RegisterFailPayload) {
    const current = await this.#ensure(ticketId);
    const nextFailCount = current.failCount + 1;

    const addedSeconds = Math.min(
      BASE_BLOCK_SECONDS * Math.pow(2, Math.max(0, nextFailCount - 1)),
      MAX_BLOCK_SECONDS,
    );
    const blockedUntil =
      addedSeconds > 0 ? new Date(Date.now() + addedSeconds * 1000) : null;

    return (this.#prismaService as any).shareGuard.update({
      where: { ticketId },
      data: {
        failCount: nextFailCount,
        lastFailAt: new Date(),
        blockedUntil,
        reason,
      },
    });
  }

  async isBlocked(ticketId: string) {
    const guard = await this.#ensure(ticketId);
    const blocked = Boolean(
      guard.blockedUntil && guard.blockedUntil.getTime() > Date.now(),
    );
    return { blocked, guard };
  }

  async getRecentLogs(ticketId: string, since: Date): Promise<ScanLog[]> {
    return (this.#prismaService as any).scanLog.findMany({
      where: { ticketId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    }) as unknown as ScanLog[];
  }

  async evaluate(input: GuardEvalInput): Promise<GuardVerdict> {
    const { incomingDeviceHash, gate, now, ticketId } = input;
    const { raceWindowMs, flipFlopWindowMs, flipFlopMaxToggles } =
      SECURITY.shareGuard;

    // Device-Mismatch → harte Policy (BLOCK + temporär sperren)
    const ticket = await (this.#prismaService as any).ticket.findUnique({
      where: { id: ticketId },
    });
    if (
      ticket?.deviceBoundKey &&
      incomingDeviceHash &&
      ticket.deviceBoundKey !== incomingDeviceHash
    ) {
      await this.blockTemporarily(
        ticketId,
        SECURITY.shareGuard.mismatchBlockMs,
        'DEVICE_MISMATCH',
      );
      return GuardVerdict.BLOCK_DEVICE_MISMATCH;
    }

    // Doppel-Scan / Race
    const raceStart = new Date(now.getTime() - raceWindowMs);
    const recent = await this.getRecentLogs(ticketId, raceStart);
    const race = recent.some((l) => {
      // anderes Gerät in kurzem Fenster
      if (
        incomingDeviceHash &&
        l.deviceHash &&
        l.deviceHash !== incomingDeviceHash
      )
        return true;
      // optional anderes Gate
      if (gate && l.gate && l.gate !== gate) return true;
      return false;
    });
    if (race) return GuardVerdict.BLOCK_DOUBLE_SCAN;

    // Flip-Flop
    const ffStart = new Date(now.getTime() - flipFlopWindowMs);
    const flips = (await this.getRecentLogs(ticketId, ffStart)).filter(
      (l) => l.verdict === 'OK',
    ).length;
    if (flips >= flipFlopMaxToggles) return GuardVerdict.BLOCK_FLIP_FLOP;

    return GuardVerdict.ALLOW;
  }
}

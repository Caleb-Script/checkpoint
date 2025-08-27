/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

type RegisterFailParams = {
  ticketId: string;
  reason: string;
};

/**
 * Einfache Anti-Sharing Sperrlogik:
 * - failCount inkrementieren
 * - blockedUntil = now + min(BASE * 2^(failCount-1), MAX)
 */
const BASE_BLOCK_SECONDS = 30;
const MAX_BLOCK_SECONDS = 10 * 60; // 10 Minuten

@Injectable()
export class ShareGuardService {
  readonly #prismaService: PrismaService;

  constructor(prisma: PrismaService) {
    this.#prismaService = prisma;
  }

  async findById(ticketId: string) {
    return (this.#prismaService as any).shareGuard.findUnique({
      where: { ticketId },
    });
  }

  async ensure(ticketId: string) {
    return (this.#prismaService as any).shareGuard.upsert({
      where: { ticketId },
      update: {},
      create: { ticketId },
    });
  }

  async registerFail({ ticketId, reason }: RegisterFailParams) {
    const current = await this.ensure(ticketId);
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

  async isBlocked(ticketId: string) {
    const guard = await this.ensure(ticketId);
    const blocked = Boolean(
      guard.blockedUntil && guard.blockedUntil.getTime() > Date.now(),
    );
    return { blocked, guard };
  }
}

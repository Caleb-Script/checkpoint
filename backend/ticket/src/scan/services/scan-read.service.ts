/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ScanReadService {
  // private readonly logger = new Logger(ScanReadService.name);

  readonly #prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.#prismaService = prismaService;
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
}

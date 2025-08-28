/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ShareGuardReadService {
  readonly #prismaService: PrismaService;

  constructor(prisma: PrismaService) {
    this.#prismaService = prisma;
  }

  async findById(ticketId: string) {
    return (this.#prismaService as any).shareGuard.findUnique({
      where: { ticketId },
    });
  }
}

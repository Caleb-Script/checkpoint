/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class EventReadService {
  readonly #prismaService: PrismaService;

  constructor(prisma: PrismaService) {
    this.#prismaService = prisma;
  }

  async findAll() {
    return await this.#prismaService.event.findMany({
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const found = await this.#prismaService.event.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Event nicht gefunden');
    return found;
  }
}

import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Event } from '../models/entities/event.entity.js';

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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class EventWriteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    startsAt: string;
    endsAt: string;
    allowReEntry?: boolean;
    rotateSeconds?: number;
    maxSeats?: number;
  }) {
    return await this.prisma.event.create({
      data: {
        name: data.name,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        allowReEntry: data.allowReEntry ?? true,
        maxSeats: data.maxSeats ?? 300,
        rotateSeconds: data.rotateSeconds ?? 60,
      },
    });
  }

  async update(id: string, patch: Partial<Prisma.EventUpdateInput>) {
    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Event nicht gefunden');
    return this.prisma.event.update({
      where: { id },
      data: {
        ...patch,
        startsAt: patch.startsAt ? new Date(String(patch.startsAt)) : undefined,
        endsAt: patch.endsAt ? new Date(String(patch.endsAt)) : undefined,
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Event nicht gefunden');
    return this.prisma.event.delete({ where: { id } });
  }
}

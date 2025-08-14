/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SeatWriteService {
  constructor(private readonly prisma: PrismaService) {}

  listByEvent(eventId: string) {
    return this.prisma.seat.findMany({
      where: { eventId },
      orderBy: [{ section: 'asc' }, { table: 'asc' }, { number: 'asc' }],
    });
  }

  create(input: {
    eventId: string;
    section?: string | null;
    table?: string | null;
    number?: string | null;
    note?: string | null;
  }) {
    return this.prisma.seat.create({ data: input });
  }

  async bulkImport(
    eventId: string,
    seats: Array<{
      section?: string | null;
      table?: string | null;
      number?: string | null;
      note?: string | null;
    }>,
  ) {
    if (!seats?.length) return [];
    const data = seats.map((s) => ({ eventId, ...s }));
    await this.prisma.seat.createMany({ data, skipDuplicates: true });
    return this.listByEvent(eventId);
  }
}

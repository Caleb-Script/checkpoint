/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class TicketReadService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return (this.prisma as any).ticket.findUnique({ where: { id } });
  }

  find(params: any = {}) {
    return (this.prisma as any).ticket.findMany(params);
  }
}

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TicketReadService {
  readonly #prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.#prismaService = prismaService;
  }

  async findById(id: string) {
    return await (this.#prismaService as any).ticket.findUnique({
      where: { id },
    });
  }

  async find(params: any = {}) {
    return await (this.#prismaService as any).ticket.findMany(params);
  }

  async findByInvitation(invitationId: string) {
    return await (this.#prismaService as any).ticket.findUnique({
      where: { invitationId },
    });
  }

  async findTicketByDeviceKey(token: string) {
    return await (this.#prismaService as any).ticket.findFirst({
      where: { deviceBoundKey: token },
    });
  }

  async findByGuest(guestProfileId: string) {
    return await (this.#prismaService as any).ticket.findMany({
      where: { guestProfileId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async findByEvent(eventId: string) {
    return await (this.#prismaService as any).ticket.findMany({
      where: { eventId },
      orderBy: [{ seatId: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

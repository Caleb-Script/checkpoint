/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { TicketReadService } from './ticket-read.service.js';
import { randomUUID } from 'crypto';
import { PresenceState } from '@prisma/client';
import {
  signTicketJwt,
  TicketJwtPayload,
  verifyTicketJwt,
} from '../utils/jwt.util.js';
import { Ticket } from '../models/entity/ticket.entity.js';

@Injectable()
export class TicketWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketReadService: TicketReadService,
  ) {}

  create(input: CreateTicketInput) {
    const data = {
      event: input.eventId,
      invitation: input.invitationId,
      currentState: 'OUTSIDE',
      deviceBoundKey: null,
      revoked: false,
      seat: input.seatId,
      lastRotatedAt: null,
    };
    return (this.prisma as any).ticket.create({ data: input });
  }

  delete(id: string) {
    return (this.prisma as any).ticket.delete({ where: { id } });
  }


  async rotate(
    ticketId: string,
    ttlSeconds?: number,
    deviceHash?: string,
  ) {
    const ticket: Ticket = await this.ticketReadService.findById(ticketId);
    if (ticket.revoked) throw new BadRequestException('Ticket revoked');

    const ttl =ttlSeconds ?? 60; // Default TTL in seconds
    // ⚠️ Nur Minimaldaten ins JWT packen
    const payload = {
      sub: ticket.id, // Ticket-ID
      jti: randomUUID(), // eindeutige Token-ID
      eventId: ticket.eventId, // Event-ID
      deviceHash: deviceHash ?? undefined, // Gerät-Bindung
    };

    const token = await signTicketJwt(payload, ttl);

    await this.prisma.ticket.update({
      where: { id: ticket.id },

      data: { lastRotatedAt: new Date() },
    });

    return { token, ttlSeconds: ttl };
  }

  async handleScan(
    token: string,
    // gate = 'Main Entrance',
    // scannerUserId?: string,
  ) {
    try {
      const { payload } = await verifyTicketJwt(token);

      const ticketId = payload.sub as string;
      const deviceHash = payload.deviceHash as string | undefined;

      // 🎯 Jetzt holen wir den aktuellen State IMMER aus der DB
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.revoked) throw new BadRequestException('Ticket revoked');

      // Toggle State (INSIDE ⇆ OUTSIDE)
      const newState = ticket.currentState === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';

      // Falls Wiedereintritt nicht erlaubt
      // if (ticket.currentState === 'INSIDE' && !ticket.event.allowReEntry) {
      //   throw new BadRequestException('Re-entry not allowed for this event');
      // }

      // Update Ticket
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { currentState: newState, deviceBoundKey: deviceHash ?? null },
      });

      // ScanLog schreiben
      // await this.prisma.scanLog.create({
      //   data: {
      //     ticketId,
      //     eventId: ticket.eventId,
      //     byUserId: scannerUserId,
      //     direction: newState,
      //     verdict: 'OK',
      //     gate,
      //     deviceHash,
      //   },
      // });

      // 🎯 Rückgabe: immer aktueller DB-State
      return {
        ticketId,
        eventId: ticket.eventId,
        invitationId: ticket.invitationId,
        deviceBoundKey: deviceHash,
        state: newState,
        seat: ticket.seatId!,
        deviceHash,
      };
    } catch (err) {
      console.error('❌ Invalid token:', err);
      throw new BadRequestException('Invalid token or ticket not found');
    }
  }
}

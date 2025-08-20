import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/prisma/prisma.service.js";
import { CreateTicketInput } from "../models/input/create-ticket.input.js";
import { UpdateTicketInput } from "../models/input/update-ticket.input.js";
import { TicketReadService } from "./ticket-read.service.js";

@Injectable()
export class TicketWriteService {
  constructor(private readonly prisma: PrismaService, private readonly ticketReadService: TicketReadService) {}

  create(input: CreateTicketInput) {
    return (this.prisma as any).ticket.create({ data: input });
  }

  update(input: UpdateTicketInput) {
    const { id, ...data } = input;
    return (this.prisma as any).ticket.update({ where: { id }, data });
  }

  delete(id: string) {
    return (this.prisma as any).ticket.delete({ where: { id } });
  }

  async mint(invitationId: string, seatId?: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        event: true,
        guestProfile: true,
        ticket: true,
      },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'ACCEPTED') throw new BadRequestException('Invitation not ACCEPTED');
    if (invitation.ticket) return invitation.ticket; // idempotent

    let seatConnect: Prisma.TicketCreateInput['seat'] | undefined = undefined;
    if (seatId) {
      const seat = await this.prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat) throw new BadRequestException('Seat not found');
      if (seat.eventId !== invitation.eventId) throw new BadRequestException('Seat not in same event');
      seatConnect = { connect: { id: seatId } };
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        event: { connect: { id: invitation.eventId } },
        invitation: { connect: { id: invitation.id } },
        currentState: 'OUTSIDE',
        deviceBoundKey: null,
        revoked: false,
        seat: seatConnect,
        lastRotatedAt: null,
      },
    });

    return ticket;
  }

 

  async rotate(ticketId: string, ttlSeconds?: number, deviceHash?: string) {
    const ticket = await this.getTicket(ticketId);
    if (ticket.revoked) throw new BadRequestException('Ticket revoked');

    const event = ticket.event;
    const rotate = ttlSeconds ?? Number(process.env.DEFAULT_ROTATE_SECONDS ?? event.rotateSeconds ?? 60);

    const payload: TicketJwtPayload = {
      sub: ticket.id,
      jti: randomUUID(),
      eventId: ticket.eventId,
      state: ticket.currentState as PresenceState,
      seat: ticket.seat
        ? { section: ticket.seat.section ?? undefined, row: ticket.seat.row ?? undefined, number: ticket.seat.number ?? undefined, note: ticket.seat.note ?? undefined }
        : null,
      allowReEntry: event.allowReEntry,
      deviceHash: deviceHash ?? undefined,
    };

    const token = await signTicketJwt(payload, rotate);
    await this.prisma.ticket.update({ where: { id: ticket.id }, data: { lastRotatedAt: new Date() } });
    return { token, ttlSeconds: rotate, payload };
  }
}

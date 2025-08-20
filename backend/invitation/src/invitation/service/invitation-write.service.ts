// /src/invitation/service/invitation-write.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { RsvpChoice } from '../models/enums/rsvp-choice.enum';
import { InvitationStatus } from '../models/enums/invitation-status.enum';
import { InvitationUpdateInput } from '../models/input/update-invitation.input';
import { InvitationCreateInput } from '../models/input/create-invitation.input';


@Injectable()
export class InvitationWriteService {
  constructor(private readonly prisma: PrismaService) { }

    async create(input: InvitationCreateInput) {
    if (!input.eventId) throw new BadRequestException('eventId is required');
    if (typeof input.maxInvitees === 'number' && input.maxInvitees < 0) {
      throw new BadRequestException('maxInvitees must be >= 0');
    }

    const data = {
      eventId: input.eventId,
      status: InvitationStatus.PENDING,
      maxInvitees: input.maxInvitees ?? 0,
      invitedByInvitationId: input.invitedByInvitationId ?? null,
    };

      const created = await this.prisma.invitation.create({ data });
      return created;
  }

  async createPlusOne(input) {
    const { eventId, invitedByInvitationId } = input;
    if (!eventId) throw new BadRequestException('eventId is required');
    if (!invitedByInvitationId) {
      throw new BadRequestException('invitedByInvitationId is required for Plus-Ones');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Versuch, maxInvitees zu dekrementieren, NUR wenn > 0
      const dec = await tx.invitation.updateMany({
        where: {
          id: invitedByInvitationId,
          eventId,
          maxInvitees: { gt: 0 },
        },
        data: {
          maxInvitees: { decrement: 1 },
        },
      });

      if (dec.count !== 1) {
        // Prüfen ob es die Einladung gibt (um bessere Fehlermeldungen zu liefern)
        const exists = await tx.invitation.findFirst({
          where: { id: invitedByInvitationId, eventId },
          select: { id: true, maxInvitees: true },
        });
        if (!exists) {
          throw new NotFoundException('Parent invitation (invitedByInvitationId) not found for this event');
        }
        // Existiert, aber keine Plus-Ones mehr frei
        throw new BadRequestException('No more Plus-Ones allowed for this invitation');
      }

      // 2) Kind-Einladung anlegen (maxInvitees=0)
      const created = await tx.invitation.create({
        data: {
          eventId,
          status: InvitationStatus.PENDING,
          maxInvitees: 0,
          invitedByInvitationId,
        },
      });

      return created;
    });

    return result;
  }

    async update(id: string, input: InvitationUpdateInput) {
    await this.ensureExists(id);

    const data: Record<string, any> = {};

    if (typeof input.maxInvitees === 'number') {
      if (input.maxInvitees < 0) throw new BadRequestException('maxInvitees must be >= 0');
      data.maxInvitees = input.maxInvitees;
    }

    if (typeof input.approved === 'boolean') {
      // Feld muss im Schema vorhanden sein (Boolean? @default(false))
      data.approved = input.approved;
    }

    if (typeof input.rsvpChoice !== 'undefined') {
      data.rsvpChoice = input.rsvpChoice as any;
      if (input.rsvpChoice === RsvpChoice.YES) data.status = InvitationStatus.ACCEPTED;
      if (input.rsvpChoice === RsvpChoice.NO) data.status = InvitationStatus.DECLINED;
    }
      
    if (input.invitedByInvitationId) {
      data.invitedByInvitationId = input.invitedByInvitationId;
    }
      
    if (input.guestProfileId) {
      data.guestProfileId = input.guestProfileId;
    }

    const updated = await this.prisma.invitation.update({ where: { id }, data });
    return updated;
  }

  async delete(id: string) {
    await this.ensureExists(id);
    const deleted = await this.prisma.invitation.delete({ where: { id } });
    return deleted;
  }

  async setGuestProfileId(id: string, guestProfileId: string | null) {
    await this.ensureExists(id);
    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { guestProfileId },
    });
    return updated as unknown;
  }

    async importMany(records: InvitationCreateInput[]) {
    if (!records?.length) return { inserted: 0 };

    const ops = records.map((r) =>
      this.prisma.invitation.create({
        data: {
          eventId: r.eventId,
          status: InvitationStatus.PENDING,
          maxInvitees: r.maxInvitees ?? 0,
          invitedByInvitationId: r.invitedByInvitationId ?? null,
          // KEIN guestProfileId hier!
        },
      }),
    );

    const res = await this.prisma.$transaction(ops);
    return { inserted: res.length };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.invitation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Invitation not found');
  }
}

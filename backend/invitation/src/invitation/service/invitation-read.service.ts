// /src/invitation/service/invitation-read.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class InvitationReadService {
  readonly #prismaService: PrismaService;

  constructor(prisma: PrismaService) {
    this.#prismaService = prisma;
  }

  async findAll() {
    return await this.#prismaService.invitation.findMany({});
  }

  async findOne(id: string) {
    const found = await this.#prismaService.invitation.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException("Einladung nicht gefunden");
    return found;
  }

  async findAllPlusOnes(invitationId: string) {
    const found = await this.#prismaService.invitation.findMany({
      where: { invitedByInvitationId: invitationId },
    });
    if (!found) throw new NotFoundException("Einladung nicht gefunden");
    return found;
  }
}

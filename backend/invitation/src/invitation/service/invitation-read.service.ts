// /src/invitation/service/invitation-read.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

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
      include: {
        plusOnes: true,
      },
    });
    if (!found) throw new NotFoundException("Event nicht gefunden");
    return found;
  }
}

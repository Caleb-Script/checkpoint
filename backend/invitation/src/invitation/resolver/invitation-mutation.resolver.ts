// checkpoint/services/invitation/src/invitation-mutation.resolver.ts

// TODO Disaprove
import { Resolver, Mutation, Args, ID } from "@nestjs/graphql";
import { Invitation } from "../models/entity/invitation.entity";
import { InvitationWriteService } from "../service/invitation-write.service";
import { InvitationCreateInput } from "../models/input/create-invitation.input";
import { InvitationUpdateInput } from "../models/input/update-invitation.input";
import { AcceptRSVPInput, RSVPReply } from "../models/input/accept-rsvp.input";

@Resolver(() => Invitation)
export class InvitationMutationResolver {
  constructor(private readonly service: InvitationWriteService) {}

  @Mutation(() => Invitation)
  async createInvitation(
    @Args("input") input: InvitationCreateInput,
  ): Promise<Invitation> {
    return this.service.create(input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async createPlusOnesInvitation(
    @Args("input") input: InvitationCreateInput,
  ): Promise<Invitation> {
    return this.service.createPlusOne(input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async updateInvitation(
    @Args("input") input: InvitationUpdateInput,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Invitation> {
    return this.service.update(id, input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async replyInvitation(
    @Args("id", { type: () => ID }) id: string,
    @Args("reply") reply: RSVPReply,
  ): Promise<Invitation> {
    return this.service.reply({ id, reply }) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async removeInvitation(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Invitation> {
    return this.service.delete(id) as Promise<Invitation>;
  }

  // 🔻 NEU: Einzelnes Plus-One löschen (gibt 1 Slot an Parent zurück)
  @Mutation(() => Invitation)
  async removePlusOneInvitation(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Invitation> {
    return this.service.deletePlusOne(id) as Promise<Invitation>;
  }

  // 🔻 NEU: Alle Plus-Ones einer Parent-Einladung löschen (gibt alle Slots zurück)
  @Mutation(() => [Invitation])
  async removeAllPlusOnesByInvitationId(
    @Args("invitedByInvitationId", { type: () => ID })
    invitedByInvitationId: string,
  ): Promise<Invitation[]> {
    return this.service.deleteAllPlusOnes(invitedByInvitationId) as Promise<
      Invitation[]
    >;
  }
}

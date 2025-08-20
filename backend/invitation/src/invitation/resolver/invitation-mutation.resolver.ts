// checkpoint/services/invitation/src/invitation-mutation.resolver.ts
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Invitation } from '../models/entity/invitation.entity';
import { InvitationWriteService } from '../service/invitation-write.service';
import { InvitationCreateInput } from '../models/input/create-invitation.input';
import { InvitationUpdateInput } from '../models/input/update-invitation.input';


@Resolver(() => Invitation)
export class InvitationMutationResolver {
  constructor(private readonly service: InvitationWriteService) { }

  @Mutation(() => Invitation)
  async createInvitation(
    @Args('input') input: InvitationCreateInput,
  ): Promise<Invitation> {
    return this.service.create(input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async createPlusOnesInvitation(
    @Args('input') input: InvitationCreateInput,
  ): Promise<Invitation> {
    return this.service.createPlusOne(input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async updateInvitation(
    @Args('input') input: InvitationUpdateInput,
    @Args('id') id: string,
  ): Promise<Invitation> {
    return this.service.update(id, input) as Promise<Invitation>;
  }

  @Mutation(() => Invitation)
  async removeInvitation(@Args('id') id: string): Promise<Invitation> {
    return this.service.delete(id) as Promise<Invitation>;
  }
}

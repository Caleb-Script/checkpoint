// checkpoint/services/invitation/src/invitation-query.resolver.ts
import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { Invitation } from '../models/entity/invitation.entity';
import { InvitationReadService } from '../service/invitation-read.service';

@Resolver(() => Invitation)
export class InvitationQueryResolver {
  constructor(private readonly service: InvitationReadService) { }

  @Query(() => [Invitation], { name: 'invitations' })
  get() {
    return this.service.findAll();
  }

  @Query(() => Invitation, { name: 'invitation' })
  getById(@Args('id', { type: () => ID }) id: string) {
    return this.service.findOne(id);
  }
}
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { Invitation } from '../models/entity/invitation.entity';
import { PUB_SUB } from '../utils/pubsub.provider';
import { pubsub } from '../utils/pubsub';

@Resolver(() => Invitation)
export class InvitationSubscriptionResolver {
    constructor(
    ) { }

    // … deine Queries/Mutations …

    @Subscription(() => Invitation, {
        resolve: (payload) => payload.invitationUpdated,
    })
    invitationUpdated(
        @Args('id', { type: () => String, nullable: true }) id?: string,
        @Args('eventId', { type: () => String, nullable: true }) eventId?: string,
    ) {
        console.log('ASDASDASDASDASDASDASDASDASDASDASDASDASDASDASD')
        return withFilter(
            () => pubsub.asyncIterator('invitationUpdated'),
            (payload: { invitationUpdated: Invitation }) => {
                const inv = payload.invitationUpdated;
                if (id) return inv.id === id;
                if (eventId) return inv.eventId === eventId;
                return true;
            },
        )();
    }
}

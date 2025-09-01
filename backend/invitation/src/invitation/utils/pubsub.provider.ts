import { PubSub } from 'graphql-subscriptions';
import { Provider } from '@nestjs/common';

export const PUB_SUB = 'PUB_SUB';

export const PubSubProvider: Provider = {
    provide: PUB_SUB,
    useFactory: () => new PubSub(), // oder RedisPubSub für verteilte Setups
};

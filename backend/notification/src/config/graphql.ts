import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(createClient({
    url: 'ws://localhost:3005/graphql',
    connectionParams: {
        // Authorization: `Bearer ${token}`
    },
}));

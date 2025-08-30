import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

let client: ApolloClient<any> | null = null;

function createHttpLink() {
  return new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL,
    // credentials: 'include', // falls Cookie-Auth
  });
}

export function makeApolloClient() {
  const httpLink = createHttpLink();

  // Nur im Browser ein WS-Link aufbauen (SSR hat kein WebSocket)
  if (typeof window !== 'undefined') {
    // ↓ genau der Code, nach dem du gefragt hast:
    const { GraphQLWsLink } = require('@apollo/client/link/subscriptions');
    const { createClient } = require('graphql-ws');

    const wsLink = new GraphQLWsLink(
      createClient({
        url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!,
        connectionParams: async () => {
          // Optional: Token anhängen (falls nicht Cookie-basiert)
          const token = localStorage.getItem('access_token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    );

    const link = split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return (
          def.kind === 'OperationDefinition' && def.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    );

    return new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });
  }

  // Auf dem Server: nur HTTP-Link
  return new ApolloClient({
    ssrMode: true,
    link: httpLink,
    cache: new InMemoryCache(),
  });
}

export function getApolloClient() {
  if (!client) client = makeApolloClient();
  return client;
}

'use client';

import { ApolloProvider } from '@apollo/client';
import { ReactNode, useMemo } from 'react';
import { getApolloClient } from '../lib/apolloClient2';

export default function ApolloProviders({ children }: { children: ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

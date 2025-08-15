import { BASEDIR } from './app.js';
import {
  type ApolloDriverConfig,
  ApolloFederationDriver,
} from '@nestjs/apollo';
import { join } from 'node:path';

const schemaGraphQL = join(
  BASEDIR,
  'config',
  'resources',
  'graphql',
  'schema.graphql',
);
console.debug('schemaGraphQL = %s', schemaGraphQL);

/**
 * Das Konfigurationsobjekt für GraphQL (siehe src\customer.module.ts).
 */
export const graphQlModuleOptions: ApolloDriverConfig = {
  typePaths: [schemaGraphQL],
  // alternativ: Mercurius (statt Apollo) fuer Fastify (statt Express)
  // driver: ApolloDriver,
  driver: ApolloFederationDriver,
  playground: false,
  context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
  // TODO formatError und logger konfigurieren, damit UserInputError nicht in der Konsole protokolliert wird
};

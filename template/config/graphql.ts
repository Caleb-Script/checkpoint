import {
  ApolloDriver,
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
  type ApolloDriverConfig,
} from '@nestjs/apollo';
import { join } from 'node:path';

// Utility zur sicheren Pfadwahl
function getSafeSchemaPath(): string | false {
  const target = process.env.SCHEMA_TARGET ?? 'dist';
  if (target === 'false') return false;
  if (target === 'tmp') return '/tmp/schema.gql';
  return join(process.cwd(), target, 'schema.gql');
}

/**
 * Standard-GraphQL-Konfiguration (ohne Federation).
 */
export const graphQlModuleOptions: ApolloDriverConfig = {
  autoSchemaFile: getSafeSchemaPath(),
  sortSchema: true,
  introspection: true,
  driver: ApolloDriver,
  playground: false,
};

/**
 * Federation-Unterstützung, z. B. für Subgraphen.
 */
export const graphQlModuleOptions2: ApolloFederationDriverConfig = {
  autoSchemaFile:
    process.env.SCHEMA_TARGET === 'tmp'
      ? { path: '/tmp/schema.gql', federation: 2 }
      : process.env.SCHEMA_TARGET === 'false'
        ? false
        : { path: 'dist/schema.gql', federation: 2 },
  driver: ApolloFederationDriver,
  playground: false,
};

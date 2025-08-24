/**
 * @constant GRAPHQL_SCHEMA
 *
 * @description
 * Eine Umgebungsvariable, die bestimmt, wie das GraphQL-Schema geladen wird.
 *
 * - `true`: Aktiviert die Verwendung mehrerer GraphQL-Schemas.
 * - `false` (Standard): Verwendet ein einzelnes zentrales Schema.
 *
 * @default
 * `false`
 *
 * @example
 * ```env
 * GRAPHQL_SCHEMA=true  // Nutzt mehrere GraphQL-Schemas.
 * GRAPHQL_SCHEMA=false // Nutzt ein einziges GraphQL-Schema.
 * ```
 */
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

/**
 * Das Konfigurationsobjekt für GraphQL (siehe src\app.module.ts).
 */
export const graphQlModuleOptions: ApolloFederationDriverConfig = {
    autoSchemaFile: { path: 'schema.gql', federation: 2 },
    driver: ApolloFederationDriver,
    playground: false,
};

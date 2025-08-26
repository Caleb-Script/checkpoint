import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
  DefaultOptions,
  from,
  InMemoryCache,
  NormalizedCacheObject,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import type { DefinitionNode, OperationDefinitionNode } from 'graphql';

// Subscriptions: graphql-ws + Link
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient, Client as GraphQLWSClient } from 'graphql-ws';

// ────────────────────────────────────────────────────────────────────────────────
// Singleton-Verwaltung (separat für HTTP+WS, abhängig vom Token)
// ────────────────────────────────────────────────────────────────────────────────

// Globale Variable für die Apollo Client Instanz
let client: ApolloClient<NormalizedCacheObject> | null = null;

// Aktuell verwendeter Token
let currentToken: string | undefined = undefined;

let wsClient: GraphQLWSClient | null = null;

// Abhilfe für SSR: WS nur im Browser aufbauen
const isBrowser = typeof window !== 'undefined';

// ────────────────────────────────────────────────────────────────────────────────
// Hilfsfunktionen
// ────────────────────────────────────────────────────────────────────────────────
/**
 * HTTP-Link für den Apollo Client.
 */
function buildHttpLink(uri: string) {
  return createHttpLink({
    uri, // GraphQL-Endpunkt
    credentials: 'include', // HttpOnly-Cookies mitnehmen
  });
}

// ---- Auth Link (Bearer-Header bei vorhandenem Token) -------------------------
/**
 * Middleware für den Authorization Header.
 * Fügt den Bearer-Token-Header hinzu.
 */
// const authLink = setContext((_, { headers }) => ({
//   headers: {
//     ...headers,
//     Authorization: token ? `Bearer ${token}` : '', // Auth-Header nur hinzufügen, wenn ein Token vorhanden ist
//   },
// }));
function buildAuthLink(token: string | undefined) {
  return setContext((_, { headers }) => {
    const nextHeaders: Record<string, string> = {
      ...(headers as Record<string, string> | undefined),
    };
    if (token) {
      nextHeaders['Authorization'] = `Bearer ${token}`;
    }
    return { headers: nextHeaders };
  });
}

// ---- Error Link (korrekt statt .catch auf Observable) -----------------------------
// Loggt GraphQL- und Netzwerkfehler und leitet sie weiter.
function buildErrorLink() {
  return onError(
    ({ graphQLErrors, networkError, operation }) => {
      const opName = operation.operationName ?? 'unknown';
      if (graphQLErrors && graphQLErrors.length > 0) {
        console.error(
          '[Apollo][GraphQL]',
          opName,
          graphQLErrors.map((e) => ({
            message: e.message,
            path: e.path,
            locations: e.locations,
            extensions: e.extensions,
          })),
        );
      }
      if (networkError) {
        console.error('[Apollo][Network]', opName, {
          name: networkError.name,
          message: networkError.message,
        });
      }
    },

    // Beispiel: bei UNAUTHENTICATED könnte man hier refreshen/retryen
    // return forward(operation); // Weiterreichen (optional Retry-Logik));
  );
}

// ---- Logging (Request/Response) ----------------------------------------------
// Request-Logger (hilft auf iOS)
function buildLogLink(uri: string) {
  return new ApolloLink((operation, forward) => {
    // sichtbares Logging im Xcode Output
    console.log(
      '[Apollo] →',
      operation.operationName,
      uri,
      operation.variables,
    );
    return forward(operation).map((data) => {
      console.log('[Apollo] ←', operation.operationName, data);
      return data;
    });
  });
}

function isSubscription(
  def: DefinitionNode | null,
): def is OperationDefinitionNode {
  return (
    !!def &&
    def.kind === 'OperationDefinition' &&
    def.operation === 'subscription'
  );
}

function inferWsUrlFromHttp(httpUrl: string): string {
  // http(s)://host/path  →  ws(s)://host/path
  if (httpUrl.startsWith('https://')) return `wss://${httpUrl.slice(8)}`;
  if (httpUrl.startsWith('http://')) return `ws://${httpUrl.slice(7)}`;
  // Fallback: wenn bereits ws/wss angegeben wurde oder relative URL
  return httpUrl.replace(/^http/, 'ws');
}

// ────────────────────────────────────────────────────────────────────────────────
/**
 * Erstellt oder gibt eine existierende Apollo Client Instanz (HTTP + WS) zurück.
 * Re-Creation erfolgt, wenn sich der Token ändert.
 *
 * Erstellt oder gibt eine existierende Apollo Client Instanz zurück.
 * @param {string} token - Der Authentifizierungstoken.
 * @returns {ApolloClient<NormalizedCacheObject>} Die Singleton Apollo Client Instanz.
 */
const getApolloClient = (
  token: string | undefined,
): ApolloClient<NormalizedCacheObject> => {
  if (client && currentToken !== token) {
    return client; // Gibt die existierende Instanz zurück, wenn der Token gleich ist
  }

  const httpUri = process.env.NEXT_PUBLIC_BACKEND_SERVER_URL;
  if (!httpUri) {
    throw new Error(
      'Setze NEXT_PUBLIC_BACKEND_SERVER_URL (HTTP GraphQL Endpoint).',
    );
  }

  const wsUri =
    (typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_GRAPHQL_WS_URL) ||
    (isBrowser ? inferWsUrlFromHttp(httpUri) : undefined);

  // ── Links: Error + Log + Auth + HTTP
  const errorLink = buildErrorLink();
  const logLink = buildLogLink(httpUri);
  const authLink = buildAuthLink(token);
  const httpLink = buildHttpLink(httpUri);

  // ---- Optionale Afterware / Response-Inspection -----------------------------------
  // Wenn du Responses inspizieren willst, ohne auf .catch zu setzen:
  const tapLink = new ApolloLink((operation, forward) => {
    if (!forward) return null;
    return forward(operation).map((result) => {
      // Hier könntest du z.B. Extensions prüfen, Logging machen, etc.
      return result;
    });
  });

  // ── WS-Link nur im Browser & nur wenn wsUri vorhanden
  let link = from([errorLink, logLink, authLink, tapLink, httpLink]);

  if (isBrowser && wsUri) {
    // Alten WS-Client schließen, wenn Token gewechselt hat
    if (wsClient && currentToken !== token) {
      try {
        wsClient.dispose();
      } catch {
        /* noop */
      }
      wsClient = null;
    }

    if (!wsClient) {
      wsClient = createClient({
        url: wsUri,
        // Lazy-Verbindung: erst bei erster Subscription verbinden
        lazy: true,
        keepAlive: 15_000,
        retryAttempts: Infinity,
        retryWait: async (retries) => {
          // Exponentielles Backoff capped
          const ms = Math.min(1000 * 2 ** retries, 10_000);
          await new Promise((r) => setTimeout(r, ms));
        },
        connectionParams: async (): Promise<Record<string, unknown>> => {
          // Token im connectionParams mitschicken; Cookies sendet der Browser je nach SameSite/Domain
          return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        },
      });
    }

    const wsLink = new GraphQLWsLink(wsClient);

    // Split: Subscriptions → WS, sonst → HTTP
    link = split(
      ({ query }) => isSubscription(getMainDefinition(query)),
      wsLink,
      from([errorLink, logLink, authLink, tapLink, httpLink]),
    );
  }

  // ---- Cache & Defaults -------------------------------------------------------------
  const cache = new InMemoryCache({
    // Falls nötig: typePolicies hier definieren
    addTypename: false, // Verhindert die automatische Hinzufügung von "__typename"
  });
  const defaultOptions: DefaultOptions = {
    watchQuery: {
      // fetchPolicy: 'no-cache', // Verhindert das Caching
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      // fetchPolicy: 'no-cache', // Immer direkte Abfrage
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  };

  // Apollo Client erstellen
  client = new ApolloClient({
    link,
    cache,
    defaultOptions,
    // Hinweis: Für SSR mit Next.js App Router ggf. noch "ssrMode: !isBrowser" ergänzen
    ssrMode: !isBrowser,
  });

  // Aktualisiere den aktuellen Token
  currentToken = token;

  return client;
};

export default getApolloClient;

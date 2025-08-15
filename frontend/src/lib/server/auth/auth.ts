'use server';

import { LOGIN, LOGOUT, ME } from '../../../graphql/auth/mutation';
import {
  KeycloakUserInfo,
  LoginInput,
  Token,
} from '../../../types/auth/auth.type';
import { handleGraphQLError } from '../../../utils/graphqlHandler.error';
import { getLogger } from '../../../utils/logger';
import getApolloClient from '../../apolloClient';
import { getCookies } from '../../../utils/getCookies';

const logger = getLogger('auth.ts');

export async function fetchAllRoles({ username, password }: LoginInput) {
  try {
    logger.debug('login: username=%s password=%s', username, password);

    const client = getApolloClient(undefined);
    const { data } = await client.mutate({
      mutation: LOGIN,
      variables: { username, password },
    });

    const token: Token = data.login || [];
  } catch (error) {
    handleGraphQLError(error, 'Fehler beim Einloggen');
  }
}

export async function fetchUserInfo(): Promise<KeycloakUserInfo | null> {
  try {
    const client = getApolloClient(undefined);
    const { data } = await client.query({
      query: ME,
      context: {
        headers: { cookie: await getCookies() },
      },
    });

    const userInfo: KeycloakUserInfo = data.me;
    return userInfo;
  } catch (error) {
    // handleGraphQLError(error, 'Fehler beim Abrufen der Benutzerdaten');
    return null;
  }
}

export async function fetchLogout() {
  logger.debug('logout');

  const client = getApolloClient(undefined);
  try {
    await client.mutate({
        mutation: LOGOUT,
        context: {
            headers: { cookie: await getCookies() },
          },
    });
  } catch (error) {
    handleGraphQLError(error, 'Fehler beim Ausloggen');
  } finally {
    await client.clearStore(); // Cache leeren
    
  }
}

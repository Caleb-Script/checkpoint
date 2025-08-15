'use server';

import { LOGIN } from "../../../graphql/auth/mutation";
import { LoginInput, Token } from "../../../types/auth/auth.type";
import { handleGraphQLError } from "../../../utils/graphqlHandler.error";
import { getLogger } from "../../../utils/logger";
import getApolloClient from "../../apolloClient";

const logger = getLogger('role.api.ts');


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

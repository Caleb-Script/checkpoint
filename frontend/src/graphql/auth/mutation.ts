import { gql } from '@apollo/client';

export const LOGIN = gql`
mutation Login($username: String!, $password: String!) { 
    login(username: $username, password: $password) {
        access_token
        expires_in
        refresh_token
        refresh_expires_in
        id_token
        scope
        roles
    }
}
`;


export const REFRESH = gql`
mutation Refresh($refreshToken: String!) {
    refresh(refresh_token: $refreshToken) {
        access_token
        expires_in
        refresh_token
        refresh_expires_in
        id_token
        scope
        roles
    }
}
`;


export const SIGNIN = gql`
mutation SignIn($input: UserInput!) {
    signIn(
        input: $input
    ) {
        username
        password
    }
}
`;


export const UPDATE_USER = gql`
mutation UpdateUser ($username: String!, $input: UserInput) {
    updateUser(
        userIdOrUsername: $username
        input: $input
    ) {
        ok
    }
}
`;

export const UPDATE_PASSWORD = gql`
mutation UpdatePassword ($username: String!, $password: String!){
    setUserPassword(
        input: { userIdOrUsername: $username, newPassword: $password }
    ) {
        ok
    }
}
`;

export const ASSIGN_ROLE = gql`
mutation AssignRealmRole ($username: String!, $roleName: Role!){
    assignRealmRole(username: $username, roleName: $roleName) {
        ok
    }
}
`;

export const DELTE_USER = gql`
mutation DeleteUser($username: String!) {
    deleteUser(userIdOrUsername: $username) {
        ok
    }
}
`;

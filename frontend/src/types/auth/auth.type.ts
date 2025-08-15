export type LoginInput = {
    username: string;
    password: string;
}

export type Token = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
    id_token: string;
    scope: string;
}
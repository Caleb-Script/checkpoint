import dotenv from 'dotenv';
import process from 'node:process';

// TODO: node --env-file .env
dotenv.config();

const { NODE_ENV, LOG_DEFAULT, KEYS_PATH, HTTPS } = process.env;

export const env = {
    NODE_ENV,
    LOG_DEFAULT,
    KEYS_PATH,
    HTTPS,
} as const;

console.debug('NODE_ENV = %s', NODE_ENV);
console.debug('NODE_ENV = %s', LOG_DEFAULT);

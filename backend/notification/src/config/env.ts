const { NODE_ENV, LOG_DEFAULT, KEYS_PATH, HTTPS, TEMPO_URI, PORT, SERVICE } =
  process.env;

export const env = {
  NODE_ENV,
  LOG_DEFAULT,
  KEYS_PATH,
  HTTPS,
  TEMPO_URI,
  PORT,
  SERVICE,
} as const;

console.debug('NODE_ENV = %s', NODE_ENV);

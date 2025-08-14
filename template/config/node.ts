import { RESOURCES_DIR, config } from './app.js';
import { env } from './env.js';
import { hostname } from 'node:os';
import { httpsOptions } from './https.js';

const { NODE_ENV, TEMPO_URI } = env;

const computername = hostname();
const port = (config.node?.port as number | undefined) ?? 3000;

export const nodeConfig = {
  host: computername,
  port,
  resourcesDir: RESOURCES_DIR,
  httpsOptions,
  database: 'profile',
  nodeEnv: NODE_ENV as
    | 'development'
    | 'PRODUCTION'
    | 'production'
    | 'test'
    | undefined,
  tempo: TEMPO_URI,
} as const;

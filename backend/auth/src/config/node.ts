import { RESOURCES_DIR, config } from './app.js';
import { env } from './env.js';
import { hostname } from 'node:os';
import { httpsOptions } from './https.js';

const { NODE_ENV, TEMPO_URI } = env;

const computername = hostname();
const port = (config.node?.port as number | undefined) ?? 3000; // eslint-disable-line @typescript-eslint/no-magic-numbers

/**
 * Die Konfiguration für den _Node_-basierten Server:
 * - Rechnername
 * - IP-Adresse
 * - Port
 * - `PEM`- und Zertifikat-Datei mit dem öffentlichen und privaten Schlüssel
 *   für TLS
 */

export const nodeConfig = {
  host: computername,
  // Shorthand Property ab ES 2015
  port,
  resourcesDir: RESOURCES_DIR,
  httpsOptions,
  nodeEnv: NODE_ENV as
    | 'development'
    | 'PRODUCTION'
    | 'production'
    | 'test'
    | undefined,
  tempo: TEMPO_URI,
} as const;

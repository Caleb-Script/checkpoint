import { env } from "./env.js";
import { hostname } from "node:os";

const { NODE_ENV, TEMPO_URI, PORT, SERVICE } = env;

const computername = hostname();
const port = PORT ?? 3001;
const service = SERVICE ?? "event";

export const nodeConfig = {
  host: computername,
  port,
  service,
  nodeEnv: NODE_ENV as
    | "development"
    | "PRODUCTION"
    | "production"
    | "test"
    | undefined,
  tempo: TEMPO_URI,
} as const;

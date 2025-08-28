// ticket-service/src/config/security.config.ts
export const SECURITY = {
  qrToken: {
    ttlSeconds: 60, // QR-JWT Lebensdauer
    issuer: 'checkpoint-backend',
    audience: 'checkpoint-scanner',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    jtiPrefix: 'qrjti:',
    lockPrefix: 'lock:ticket:',
    cooldownPrefix: 'cooldown:ticket:',
  },
  toggleCooldownMs: 7000, // Mindestabstand je Ticket zwischen Scans
  shareGuard: {
    mismatchBlockMs: 3 * 60_000, // 3 Min Sperre bei Device-Mismatch
    raceWindowMs: 10_000, // Zeitfenster für Doppel-Scan
    flipFlopWindowMs: 60_000, // Zeitfenster für Flip-Flop
    flipFlopMaxToggles: 4, // Max Toggles im Fenster
  },
} as const;

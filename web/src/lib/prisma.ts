// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/prisma.ts

import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient Singleton für Next.js (App Router).
 * Verhindert, dass bei Hot-Reload in Dev mehrfach Verbindungen geöffnet werden.
 *
 * WICHTIG:
 * - Nur in Server Components, Server Actions oder Route-Handlern importieren.
 * - Nicht in Client Components verwenden.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// In Dev im globalen Scope cachen
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;


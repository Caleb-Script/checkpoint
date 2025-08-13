// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/ws-status/route.ts
import { NextResponse } from "next/server";

/**
 * Healthcheck für WebSocket + App.
 * - Läuft ohne harte Abhängigkeit zu ws-server.js
 * - Falls ws-server.js eine getClientCount()-Funktion anbietet, wird sie genutzt
 * - Sonst werden sinnvolle Fallback-Infos zurückgegeben
 */

export async function GET() {
    // Optional: Versuch, ws-server.js dynamisch zu laden (CommonJS)
    let wsAvailable = false;
    let clientCount: number | null = null;

    try {
        // Pfad relativ zu dieser Datei:
        // src/app/api/ws-status/route.ts  ->  src/lib/ws-server.js
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const wsMod = require("../../../lib/ws-server.js");

        if (wsMod && typeof wsMod.getClientCount === "function") {
            wsAvailable = true;
            clientCount = Number(wsMod.getClientCount());
            if (Number.isNaN(clientCount)) clientCount = null;
        } else if (wsMod) {
            // Modul vorhanden, aber ohne getClientCount()
            wsAvailable = true;
        }
    } catch {
        // Modul nicht gefunden oder zur Laufzeit (noch) nicht initialisiert
        wsAvailable = false;
    }

    const body = {
        ok: true,
        time: new Date().toISOString(),
        app: {
            env: process.env.NODE_ENV,
            port: process.env.PORT || 3000,
        },
        websocket: {
            url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000",
            available: wsAvailable,
            clients: clientCount, // null = unbekannt / nicht verfügbar
            hint:
                clientCount === null
                    ? "Optional: Exportiere getClientCount() in src/lib/ws-server.js für genaue Zahlen."
                    : undefined,
        },
    };

    return NextResponse.json(body, { status: 200 });
}

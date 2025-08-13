"use strict";

/**
 * Custom Next.js + WebSocket Server (Next App Router)
 * Starten in: /Users/gentlebookpro/Projekte/checkpoint/web
 *   npm run dev2    // oder: node server.js
 */

const path = require("path");
// .env / .env.local laden (für dieses Node-Script)
try {
  require("dotenv").config();
  require("dotenv").config({ path: path.join(__dirname, ".env.local") });
} catch (_) {}

const { createServer } = require("http");
const next = require("next");
const { initWebSocketServer } = require("./src/lib/ws-server.js");

// dev = true → HMR etc.; prod = false → z. B. für Deployment
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0"; // im LAN erreichbar
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * WS-URL ermitteln:
 * - Nutze NEXT_PUBLIC_WS_URL, wenn gesetzt (korrigiere offensichtliche Tippfehler wie "ws://https://…").
 * - Sonst fallback auf gleiches Origin (http -> ws, https -> wss).
 */
function resolveWsUrl(httpBase) {
  const raw = (process.env.NEXT_PUBLIC_WS_URL || "").trim();
  if (!raw) return httpBase.replace(/^http/i, "ws");

  // offensichtliche Doppelschemata reparieren: "ws://https://host" -> "wss://host"
  let s = raw.replace(/\s+/g, "");
  s = s.replace(/^ws(s)?:\/\/https?:\/\//i, "w$1://");

  // wenn nur https/http angegeben wurde, auf wss/ws mappen
  if (/^https?:\/\//i.test(s) && !/^wss?:\/\//i.test(s)) {
    s = s.replace(/^https?/i, "wss");
  }
  // wenn gar kein Schema: Standard wss://
  if (!/^(wss?|https?):\/\//i.test(s)) {
    s = `wss://${s}`;
  }
  // lokale Dev-Hosts dürfen unverschlüsselt
  if (/^(wss?|https?):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(s)) {
    s = s.replace(/^wss/i, "ws").replace(/^https?/i, "ws");
  }
  return s;
}

app
  .prepare()
  .then(() => {
    // Gemeinsamer HTTP-Server für Next + WebSocket
    const server = createServer((req, res) => {
      handle(req, res);
    });

    // WebSocket-Server an denselben HTTP-Server hängen
    initWebSocketServer(server);

    server.listen(port, hostname, () => {
      const httpBase = `http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`;
      const wsUrl = resolveWsUrl(httpBase);
      console.log(`✅ HTTP Server läuft auf ${httpBase}`);
      console.log(
        `🔌 WebSocket erreichbar über ${wsUrl} (gleiches Origin wie HTTP, z. B. über ngrok)`
      );
    });
  })
  .catch((err) => {
    console.error("Server start failed:", err);
    process.exit(1);
  });

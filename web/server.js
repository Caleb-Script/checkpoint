// /Users/gentlebookpro/Projekte/checkpoint/web/server.js
const { createServer } = require("http");
const next = require("next");
const { initWebSocketServer, handleUpgrade } = require("./src/lib/ws-server.js");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const HOST = process.env.HOST || "localhost";
const PORT = Number(process.env.PORT || 3000);

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  const wss = initWebSocketServer();

  server.on("upgrade", (req, socket, head) => {
    // Nur unsere WS-Pfade upgraden
    if (!req.url || !req.url.startsWith("/ws/")) {
      socket.destroy();
      return;
    }
    handleUpgrade(wss, req, socket, head);
  });

  server.listen(PORT, HOST, () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${HOST}:${PORT}`;
    console.log("✅ WebSocket-Server initialisiert");
    console.log(`✅ HTTP Server läuft auf http://${HOST}:${PORT}`);
    console.log(`🔌 WebSocket erreichbar über ${wsUrl} (Pfad /ws/<channel>)`);
  });
});

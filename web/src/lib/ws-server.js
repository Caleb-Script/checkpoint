// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/ws-server.js
const { WebSocketServer } = require("ws");

let wss = null;
let heartbeatTimer = null;

/**
 * Markiert einen Client als lebendig (wird bei 'pong' aufgerufen).
 */
function heartbeat() {
  this.isAlive = true;
}

/**
 * Hängt einen WebSocket-Server an den HTTP-Server (Singleton).
 * Fügt Heartbeat (Ping/Pong) hinzu, damit Proxies/Dev-Server die
 * Verbindung nicht wegschlafen lassen und tote Sockets aufgeräumt werden.
 */
function initWebSocketServer(server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", heartbeat);

    console.log(
      "🔌 Neue Security-Client-Verbindung",
      `| aktive Clients: ${getClientCount() + 1}` // +1, weil noch nicht gezählt
    );

    ws.on("close", () => {
      console.log(
        "❌ Security-Client getrennt",
        `| aktive Clients: ${getClientCount()}`
      );
    });

    ws.on("error", (err) => {
      console.warn("⚠️ WS Client Error:", err?.message || err);
    });
  });

  // Heartbeat-Intervall: alle 15s pingen
  heartbeatTimer = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch {}
        return;
      }
      ws.isAlive = false;
      try {
        ws.ping(); // Client antwortet mit 'pong' -> heartbeat()
      } catch {}
    });
  }, 15000);

  console.log("✅ WebSocket-Server initialisiert (Heartbeat aktiv)");
  return wss;
}

/**
 * Broadcastet einen neuen Scan-Log an alle verbundenen Clients.
 * @param {any} log
 */
function broadcastScanUpdate(log) {
  if (!wss) return;
  const message = JSON.stringify({ type: "scan-log", data: log });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(message);
      } catch {}
    }
  });
}

/**
 * Anzahl aktiver/verbindungsbereiter Clients ermitteln.
 */
function getClientCount() {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((c) => {
    if (c.readyState === 1) count++;
  });
  return count;
}

/**
 * Optionaler Shutdown-Hook (z. B. bei process.on('SIGINT')).
 */
function shutdownWebSocketServer() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (wss) {
    try {
      wss.close();
    } catch {}
    wss = null;
  }
  console.log("🛑 WebSocket-Server gestoppt");
}

module.exports = {
  initWebSocketServer,
  broadcastScanUpdate,
  getClientCount,
  shutdownWebSocketServer,
};

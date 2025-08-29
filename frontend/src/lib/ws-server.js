// /Users/gentlebookpro/Projekte/checkpoint/frontend/srv/lib/ws-server.js
const { WebSocketServer } = require('ws');
const url = require('url');

const CHANNELS = ['security', 'admin', 'public'];

function initWebSocketServer() {
  // Wir nutzen noServer und hooken das Upgrade im server.js
  const wss = new WebSocketServer({ noServer: true });

  // Channel -> Set<WebSocket>
  wss.channels = new Map(CHANNELS.map((c) => [c, new Set()]));

  const count = (channel) => wss.channels.get(channel)?.size ?? 0;

  function broadcast(channel, data) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    for (const ws of wss.channels.get(channel) || []) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }
  wss.broadcast = broadcast;

  // Heartbeat: Browser antworten automatisch mit 'pong'
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws, request, clientInfo) => {
    const channel = clientInfo.channel || 'public';
    ws.channel = channel;
    ws.isAlive = true;

    wss.channels.get(channel).add(ws);
    ws.on('pong', heartbeat);

    console.log(
      `🔌 Neue ${channel}-Client-Verbindung | aktive Clients: ${count(channel)}`,
    );

    ws.on('close', () => {
      wss.channels.get(channel).delete(ws);
      console.log(
        `❌ ${channel}-Client getrennt | aktive Clients: ${count(channel)}`,
      );
    });

    ws.on('error', (err) => {
      console.warn(`⚠️ WS error (${channel}): ${err.message}`);
    });

    // Optional: initiale Nachricht
    try {
      ws.send(JSON.stringify({ type: 'hello', channel, t: Date.now() }));
    } catch {}
  });

  // Ping-Loop: hält Verbindungen wach und räumt tote Verbindungen auf
  const interval = setInterval(() => {
    for (const [channel, set] of wss.channels) {
      for (const ws of set) {
        if (ws.isAlive === false) {
          try {
            ws.terminate();
          } catch {}
          set.delete(ws);
          console.log(
            `⛔️ Terminated stale ${channel}-client | aktive Clients: ${set.size}`,
          );
          continue;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch {}
      }
    }
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

function handleUpgrade(wss, request, socket, head) {
  const { pathname, query } = url.parse(request.url, true);
  // Erwartet /ws/<channel>
  const parts = pathname.split('/').filter(Boolean); // ['ws','security']
  const channel = (parts[1] || query.channel || 'public').toLowerCase();

  if (parts[0] !== 'ws' || !CHANNELS.includes(channel)) {
    socket.destroy();
    return;
  }

  // ✋ Optional: Origin-Check hier einbauen, falls nötig
  // const origin = request.headers.origin || "";

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, { channel });
  });
}

module.exports = { initWebSocketServer, handleUpgrade };

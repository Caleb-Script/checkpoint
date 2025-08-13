// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/ws.ts
/* 
  Bridge-Datei, damit TypeScript/Next API-Routen die CJS-Implementierung verwenden können.
  Next.js kompiliert TS und kann CJS via require laden.
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { broadcastScanUpdate, initWebSocketServer } = require("./ws-server.js");

export { broadcastScanUpdate, initWebSocketServer };

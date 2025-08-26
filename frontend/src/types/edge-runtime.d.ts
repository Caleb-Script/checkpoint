export {};

declare global {
  /** WebSocketPair ist nur in Edge-Runtime vorhanden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  var WebSocketPair: new () => {
    0: EdgeWebSocket;
    1: EdgeWebSocket;
  };

  /** Erweiterter Edge-WebSocket mit .accept() */
  interface EdgeWebSocket extends WebSocket {
    accept(): void;
  }

  interface ResponseInit {
    /** Edge-spezifische Erweiterung für WebSocket-Upgrade */
    webSocket?: WebSocket;
  }
}

// Simple PNG wrapper: QR als <img> in ein minimal gerendertes SVG, Ausgabe als PNG-Stream
// Für echte Gestaltung könntest du sharp/canvas einsetzen. Hier bleiben wir dependencies-light.

import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';

export function svgForTicket(params: {
  eventName: string;
  guestName?: string | null;
  seatLabel?: string | null;
  qrDataUrl: string;
  ticketId: string;
}) {
  const { eventName, guestName, seatLabel, qrDataUrl, ticketId } = params;

  const safe = (s?: string | null) =>
    s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300">
  <style>
    .title { font: 700 24px system-ui, -apple-system, Segoe UI, Roboto; fill: #111; }
    .meta  { font: 400 14px system-ui, -apple-system, Segoe UI, Roboto; fill: #333; }
    .id    { font: 500 12px ui-monospace, SFMono-Regular, Menlo; fill: #666; }
    .badge { fill: #f5f5f7; stroke: #e5e5ea; }
  </style>

  <rect x="0" y="0" width="700" height="300" fill="#fff"/>
  <rect x="20" y="20" width="420" height="260" class="badge" rx="16" />

  <image href="${qrDataUrl}" x="460" y="40" width="220" height="220" />

  <text x="40" y="70" class="title">${safe(eventName)}</text>
  <text x="40" y="110" class="meta">Gast: ${safe(guestName ?? '')}</text>
  <text x="40" y="140" class="meta">Platz: ${safe(seatLabel ?? '—')}</text>
  <text x="40" y="170" class="meta">Scan wechselt Status (IN/OUT)</text>
  <text x="40" y="235" class="id">Ticket: ${safe(ticketId)}</text>
</svg>
`;
}

// Hilfs-Funktion: SVG → PNG (einfacher Konverter über <img> DataURL ist oft ausreichend für Browser).
// Für Server-seitiges PNG könntest du 'sharp' nutzen. Hier geben wir SVG direkt zurück und der Route-Handler
// setzt image/svg+xml. Alternativ bauen wir PNG nur wenn sharp installiert wird.
export function svgToBuffer(svg: string): Buffer {
  return Buffer.from(svg, 'utf8');
}

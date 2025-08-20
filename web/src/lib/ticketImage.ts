// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/ticketImage.ts
import { createCanvas, loadImage } from "canvas";

/**
 * Zeichnet ein schickes Ticket als PNG:
 * - Apple-ähnliche Typo/Spacing
 * - Header: Event-Name
 * - Body: Gastname, Sitz (optional), Datum (optional)
 * - Unten: QR-Code (aus Data-URL)
 *
 * Rückgabe: Buffer (image/png)
 */
export async function renderTicketPng(opts: {
  eventName: string;
  guestName: string;
  seatText?: string | null;
  dateText?: string | null;
  qrDataUrl: string; // data:image/png;base64,...
}): Promise<Buffer> {
  const width = 1080; // 1080x1520 für gute WhatsApp-Vorschau
  const height = 1520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Hintergrund
  ctx.fillStyle = "#F9FAFB";
  ctx.fillRect(0, 0, width, height);

  // Ticketkarte
  const cardX = 48;
  const cardY = 48;
  const cardW = width - cardX * 2;
  const cardH = height - cardY * 2;
  const radius = 48;

  // Karte (weiße Fläche mit Schatten)
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius, "#FFFFFF");
  drawShadow(ctx, cardX, cardY, cardW, cardH, radius);

  // Innen-Padding
  const pad = 64;
  let y = cardY + pad;

  // Header
  ctx.fillStyle = "#111827";
  setFont(ctx, 48, true);
  ctx.fillText(opts.eventName, cardX + pad, y);
  y += 56;

  // Trenner
  drawDivider(ctx, cardX + pad, y, cardW - pad * 2);
  y += 48;

  // Gastname
  setFont(ctx, 40, true);
  ctx.fillStyle = "#0B1220";
  ctx.fillText(opts.guestName || "Gast", cardX + pad, y);
  y += 56;

  // Sitz + Datum (optional)
  setFont(ctx, 30, false);
  ctx.fillStyle = "#6B7280";
  if (opts.seatText) {
    ctx.fillText(`Sitz: ${opts.seatText}`, cardX + pad, y);
    y += 44;
  }
  if (opts.dateText) {
    ctx.fillText(opts.dateText, cardX + pad, y);
    y += 44;
  }

  // Platz lassen
  y += 20;

  // QR-Box
  const qrSize = 720;
  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cardY + cardH - pad - qrSize;

  // QR als Image zeichnen
  const img = await loadImage(opts.qrDataUrl);
  ctx.fillStyle = "#FFFFFF";
  drawRoundedRect(
    ctx,
    qrX - 24,
    qrY - 24,
    qrSize + 48,
    qrSize + 48,
    24,
    "#FFFFFF",
  );
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // Footer-Hinweis
  setFont(ctx, 26, false);
  ctx.fillStyle = "#6B7280";
  ctx.fillText(
    "Zeige diesen QR am Einlass. Er ist personalisiert und zeitlich begrenzt.",
    cardX + pad,
    cardY + cardH - pad - qrSize - 24,
  );

  return canvas.toBuffer("image/png");
}

// Helpers
function setFont(
  ctx: CanvasRenderingContext2D,
  size: number,
  semibold: boolean,
) {
  const weight = semibold ? 600 : 400;
  ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Segoe UI, Roboto, Helvetica, Arial`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, x, y, w, h, r, "transparent");
  ctx.restore();
}

function drawDivider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  ctx.fillStyle = "#E5E7EB";
  ctx.fillRect(x, y, w, 2);
}

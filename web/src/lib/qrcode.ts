// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/qrcode.ts
import jwt from "jsonwebtoken";
import * as QRCode from "qrcode";

/**
 * Dieses SECRET **muss** in der .env gesetzt sein:
 *  - JWT_SECRET=dein-32-zeichen-secret
 */
const SECRET = process.env.JWT_SECRET || "dev-secret"; // nur dev fallback!
const EXPIRES_SECONDS = Number(process.env.QR_EXPIRES_SECONDS || 60);

/**
 * Payload für die Scans am Eingang/Ausgang.
 * direction: "IN" | "OUT"
 */
export type TicketScanPayload = {
  ticketId: string;
  direction: "IN" | "OUT";
  deviceId?: string; // optional Bindung an Client/Device
  iat?: number;
  exp?: number;
};

/**
 * Erstellt ein signiertes JWT für ein Ticket‑Scan‑Event.
 * Wird u. a. im QR‑Code kodiert.
 */
export async function createTicketJwt(
  ticketId: string,
  direction: "IN" | "OUT",
  deviceId?: string,
): Promise<string> {
  const payload: TicketScanPayload = {
    ticketId,
    direction,
    deviceId,
  };
  // kurzlebig
  const token = jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: EXPIRES_SECONDS,
  });
  return token;
}

/**
 * Baut direkt eine QR‑Code Data‑URL (PNG) für das signierte JWT.
 */
export async function generateSignedQrCode(
  ticketId: string,
  direction: "IN" | "OUT",
  deviceId?: string,
  width = 320,
): Promise<string> {
  const tok = await createTicketJwt(ticketId, direction, deviceId);
  return QRCode.toDataURL(tok, { margin: 1, width });
}

/**
 * Verifiziert ein Ticket‑Token (z. B. in /api/scan)
 */
export function verifyTicketJwt(token: string): TicketScanPayload {
  const decoded = jwt.verify(token, SECRET) as TicketScanPayload;
  return decoded;
}

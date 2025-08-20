// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/rsvp.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";

/**
 * Payload für RSVP-Token.
 * - invitationId: Ziel-Einladung
 * - eventId: Sicherheit (Invitation gehört zu Event)
 * - canInvite: wie viele weitere Gäste der Eingeladene einladen darf (optional)
 * - iat/exp optional
 */
export type RsvpPayload = {
  invitationId: string;
  eventId: string;
  canInvite?: number;
};

export function signRsvpToken(payload: RsvpPayload, expiresIn = "14d") {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyRsvpToken(token: string): RsvpPayload {
  return jwt.verify(token, SECRET) as RsvpPayload;
}

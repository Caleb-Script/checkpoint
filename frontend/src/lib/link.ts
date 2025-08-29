// /frontend/srv/lib/links.ts
/**
 * Hilfsfunktionen zum Bauen/Teilen von Links (RSVP etc.).
 * BASE-URL:
 *  - Client: window.location.origin
 *  - Server/Fallback: NEXT_PUBLIC_BASE_URL oder http://localhost:3000
 */

export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * RSVP-Link aus Invitation-ID bauen.
 * Aktuelle Route: /rsvp?inv=<INVITATION_ID>
 */
export function rsvpLinkForInvitationId(invitationId: string): string {
  return `${getBaseUrl()}/rsvp?inv=${encodeURIComponent(invitationId)}`;
}

/** WhatsApp-Share-URL mit vorausgefülltem Text. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** mailto:-URL (optional) */
export function mailtoUrl(
  to: string | null,
  subject: string,
  body: string,
): string {
  const addr = to ?? '';
  const q = new URLSearchParams({ subject, body }).toString();
  return `mailto:${addr}?${q}`;
}

/** Inhalt in die Zwischenablage kopieren (mit Fallback). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Native Share (wenn verfügbar), sonst false zurück. */
export async function tryNativeShare(
  title: string,
  text: string,
  url: string,
): Promise<boolean> {
  try {
    if ((navigator as any)?.share) {
      await (navigator as any).share({ title, text, url });
      return true;
    }
  } catch {
    // cancelled oder nicht verfügbar
  }
  return false;
}

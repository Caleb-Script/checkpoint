// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/debug/token/page.tsx
// Server-Komponente, die den Access-Token aus dem HttpOnly-Cookie liest
// und (nur zu Debug-Zwecken) anzeigt + JWT-Header/Payload dekodiert.
//
// ⚠️ SECURITY-HINWEIS:
// - Diese Seite darf NICHT in Produktion verfügbar sein.
// - Das Rendern des Tokens im HTML offenbart den Token dem Client.
// - Entferne die Route oder schütze sie stark (IP-Filter, Admin-Auth, Basic-Auth etc.).

import { cookies } from "next/headers";

export const dynamic = "force-dynamic"; // kein Cache
export const revalidate = 0;

const COOKIE_NAME =
  process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";

/** Base64URL → JSON Parser (ohne Verify; nur für Debug) */
function b64urlToJson<T = any>(part?: string | null): T | null {
  if (!part) return null;
  try {
    // Base64URL -> Base64
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice(0, (4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Token hübsch maskieren (zeigt nur Anfang/Ende) */
function maskToken(token: string, show = false) {
  if (show) return token;
  const head = token.slice(0, 12);
  const tail = token.slice(-12);
  return `${head}…${tail}`;
}

/** Unix-Sekunden → Datum */
function fmtTs(ts?: number) {
  if (!ts) return "–";
  try {
    return new Date(ts * 1000).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  } catch {
    return String(ts);
  }
}

export default async function TokenDebugPage() {
  const token = cookies().get(COOKIE_NAME)?.value || null;

  let header: any = null;
  let payload: any = null;
  let signature = "";

  if (token) {
    const [h, p, s = ""] = token.split(".");
    header = b64urlToJson(h);
    payload = b64urlToJson(p);
    signature = s;
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0c",
        color: "#e6e6e6",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          border: "1px solid #2a2a2b",
          borderRadius: 16,
          padding: 20,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔐 Token Debug</h1>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Cookie-Name: <code>{COOKIE_NAME}</code>
        </p>

        {!token ? (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: "#2a2a2b",
              border: "1px solid #3a3a3b",
            }}
          >
            Kein Token gefunden. Bitte anmelden.
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#1d1d1f",
                border: "1px solid #323234",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Access-Token (voll):</strong>
                <small style={{ opacity: 0.75 }}>
                  ⚠️ Sichtbar nur zu Debug-Zwecken
                </small>
              </div>
              <code
                style={{
                  display: "block",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {token}
              </code>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#1d1d1f",
                border: "1px solid #323234",
              }}
            >
              <strong>Access-Token (maskiert):</strong>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
                  fontSize: 12,
                  opacity: 0.9,
                }}
              >
                {maskToken(token)}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#1d1d1f",
                border: "1px solid #323234",
              }}
            >
              <strong>JWT Header:</strong>
              <pre
                style={{
                  marginTop: 8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                }}
              >
{JSON.stringify(header, null, 2)}
              </pre>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#1d1d1f",
                border: "1px solid #323234",
              }}
            >
              <strong>JWT Payload (Claims):</strong>
              <pre
                style={{
                  marginTop: 8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                }}
              >
{JSON.stringify(payload, null, 2)}
              </pre>

              <div style={{ marginTop: 8, opacity: 0.85 }}>
                <div>
                  <span style={{ display: "inline-block", width: 100, opacity: 0.7 }}>
                    exp:
                  </span>{" "}
                  {payload?.exp ?? "–"} ({fmtTs(payload?.exp)})
                </div>
                <div>
                  <span style={{ display: "inline-block", width: 100, opacity: 0.7 }}>
                    iat:
                  </span>{" "}
                  {payload?.iat ?? "–"} ({fmtTs(payload?.iat)})
                </div>
                <div>
                  <span style={{ display: "inline-block", width: 100, opacity: 0.7 }}>
                    sub:
                  </span>{" "}
                  {payload?.sub ?? "–"}
                </div>
                <div>
                  <span style={{ display: "inline-block", width: 100, opacity: 0.7 }}>
                    email:
                  </span>{" "}
                  {payload?.email ?? "–"}
                </div>
                <div>
                  <span style={{ display: "inline-block", width: 100, opacity: 0.7 }}>
                    name:
                  </span>{" "}
                  {payload?.name ?? payload?.preferred_username ?? "–"}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#1d1d1f",
                border: "1px solid #323234",
              }}
            >
              <strong>JWT Signature:</strong>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
                  fontSize: 12,
                  wordBreak: "break-all",
                }}
              >
                {signature || "—"}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 12,
                background: "#291a1a",
                border: "1px solid #4a2a2a",
                color: "#ffb0b0",
              }}
            >
              <strong>Wichtig:</strong> Diese Seite legt geheime Daten offen.
              Nutze sie ausschließlich lokal/entwicklungsintern und entferne sie
              vor Produktion.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

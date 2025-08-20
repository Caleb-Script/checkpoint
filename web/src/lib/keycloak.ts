// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/keycloak.ts

import Keycloak from "keycloak-js";

/**
 * Keycloak-Initialisierung für die Web-App.
 * Diese Instanz ist ein Singleton, damit nicht bei jedem Import
 * ein neuer Login-Flow gestartet wird.
 *
 * Wichtig:
 * - Nur in Client Components nutzen
 * - In Next.js (App Router) am besten in einem Kontext-Provider einbinden
 */

let keycloak: Keycloak | null = null;

export function initKeycloak(): Keycloak {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080",
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "checkpoint",
      clientId:
        process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "checkpoint-guest",
    });
  }
  return keycloak;
}

/**
 * Login-Flow starten
 */
export async function keycloakLogin(redirectUri?: string) {
  const kc = initKeycloak();
  await kc.init({ onLoad: "login-required", pkceMethod: "S256" });
  if (redirectUri) {
    window.location.href = redirectUri;
  }
}

/**
 * Token automatisch erneuern
 */
export async function refreshKeycloakToken(minValidity = 30): Promise<boolean> {
  const kc = initKeycloak();
  try {
    return await kc.updateToken(minValidity);
  } catch (err) {
    console.error("Token-Refresh fehlgeschlagen", err);
    return false;
  }
}

/**
 * Benutzerinformationen holen
 */
export function getKeycloakProfile() {
  const kc = initKeycloak();
  return kc.tokenParsed || null;
}

/**
 * Token holen
 */
export function getKeycloakToken() {
  const kc = initKeycloak();
  return kc.token || null;
}

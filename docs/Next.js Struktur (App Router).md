/app
  /(public)
    /invite/[token]/page.tsx        // Magic-Link Onboarding
    /ticket/page.tsx                // QR-Ansicht (rotierend)
  /(auth)
    /login/…                        // Keycloak OIDC (next-auth-keycloak oder direct)
  /(secure)
    /admin/events/[id]/dashboard    // Übersicht, Filter, Live-Status
    /admin/events/[id]/guests       // CSV Upload, Tabelle, Versand
    /admin/events/[id]/seating      // Sitzplan-Editor
    /security/scan                  // Scanner-PWA

/src
  /components/ui/...                // MUI Komponenten
  /lib/api.ts                       // fetcher (React Query)
  /lib/keycloak.ts                  // OIDC Helfer
  /lib/jwt.ts                       // Sign/Verify JWS (server)
  /server/db.ts                     // Prisma Client
  /server/guards.ts                 // Role Guards
  /server/qr.ts                     // Rotating token issuer
/app/api
  /events/[id]/invite/route.ts      // POST: Invites erstellen
  /events/[id]/dispatch/route.ts    // POST: Links senden
  /tickets/[ticketId]/rotate/route.ts // POST: neues QR-JWT
  /scans/verify/route.ts            // POST: Scan prüfen (Security)
  /guests/import/route.ts           // POST: CSV Upload

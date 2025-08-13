# Checkpoint – Produktions‑Workflow (User Journey)

> **Ziel:** Klarer, klickbarer Ablauf für reale Nutzer (Organisator/Admin, Gast, Security) – Ende‑zu‑Ende von „Event anlegen“ bis „Scan & Reporting“. Mit konkreten Pfaden, Zuständigkeiten und Prod‑Hinweisen.
> **Stack:** Next.js 15 (App Router, TS/TSX, MUI), Prisma + Postgres, Keycloak 25, Redis, WS, JWT/QR.
> **UI‑Prinzip:** Mobile‑first, Apple‑Look.

---

## Rollen

* **Admin/Organisator**: erstellt Events, importiert Gäste, verschickt Einladungen, vergibt Plätze, gibt Tickets frei, sieht Reports.
* **Gast**: erhält Link/QR, meldet sich (Keycloak **guest**), pflegt Daten, gibt RSVP ab, ruft sein Ticket (**/my-qr**) auf.
* **Security**: scannt am Einlass/Auslass (**/scan**), sieht Platz & Status in Echtzeit.

---

## Pre‑Flight (Prod)

1. **Domain & TLS**: z. B. `https://checkpoint.dein-domain.tld` (HSTS an).
2. **Keycloak (Realm `checkpoint`)**: Clients `checkpoint-admin`, `checkpoint-guest`, `checkpoint-scanner`, `checkpoint-api`. Redirect URIs auf **Prod‑Domain** setzen.
3. **DB/Redis**: Managed Postgres (>= 16), Managed Redis; tägliche Backups, PITR aktiv.
4. **JWT‑Signierung**: **RS256** mit KMS/Secrets Manager. `JWT_PUBLIC_KEY_PATH/JWT_PRIVATE_KEY_PATH` nur in Container‑Secret.
5. **Mail/WhatsApp**: SMTP‑Provider (z. B. Postmark) + WhatsApp Business Cloud API (genehmigte Vorlagen).
6. **Observability**: Logs (JSON), Metriken (request rate, error rate, p95), Alarme.
7. **Rate‑Limits**: API‑Gateway / Edge‑Middleware (z. B. 10 req/s/IP auf /api/scan).
8. **Daten‑Schutz**: DPA/AVV, Löschkonzept für Gästedaten, DSGVO‑Konforme Einwilligungen.

---

## 1) Event anlegen (Admin)

**UI:** `/events/new` → Wizard (Name, Zeitraum, Re‑Entry, QR‑Rotate‑Sek.).
**Speichern:** `POST /api/admin/events` → Tabelle `/events` (Liste, Status, Aktionen).
**Optional:** Sitzplan importieren (CSV) über `/events/[eventId]/seats`.

**DB‑Effekt:** `Event`‑Datensatz mit `allowReEntry`, `rotateSeconds`.

---

## 2) Gäste importieren (Admin)

**UI:** `/events/[eventId]/guests/import`

* CSV Upload → Feld‑Mapping (email/phone/firstName/lastName), Duplikat‑Check, Vorschau, Fehlerbericht.
* **Ergebnis:** `GuestProfile` + `Invitation(status=PENDING, shareCode)` pro Zeile.

**API:** `POST /api/admin/invitations/import?eventId=...`
**UI (Liste):** `/events/[eventId]/invitations` (Filter: Status/RSVP/approved).

---

## 3) Einladungen verschicken (Admin)

**UI:** `/events/[eventId]/invitations`

* Multi‑Select → **Senden** (WhatsApp / E‑Mail).
* **WhatsApp:** WABA‑Vorlage mit Platzhaltern (Name, Link). Fallback: `wa.me` Link share.
* **WebApp‑Link:** `https://…/invite?code={shareCode}`
* **Optional 2. Link:** AppStore/PlayStore (wenn verfügbar).
* **Tracking:** Versandstatus/Fehler, lastSentAt.

**DB‑Effekt:** `Invitation.messageChannel` optional, `updatedAt`.

---

## 4) Gast‑Self‑Service & RSVP (Gast)

**Flow:** Einladungs‑Link → **/invite?code=…**

* **Login** (Keycloak **guest**) oder „Konto erstellen“.
* **Profilseite**: Daten prüfen/ändern (E‑Mail/Telefon), GDPR‑Hinweise bestätigen.
* **RSVP**: YES/NO; Zusagen ggf. +1 Regeln beachten (`maxInvitees`).

**API:** `GET /api/public/invite/resolve?code=…` (Lesen), `POST /api/public/rsvp` (Schreiben).
**DB‑Effekt:** `Invitation.rsvpChoice/At` + Status `ACCEPTED`/`DECLINED`.

---

## 5) Approval & Ticketing (Admin)

**UI:** `/events/[eventId]/invitations` → Filter `ACCEPTED & !approved` → **Approve**.

* Optional: **Seat zuweisen** (Auto‑Assign Regeln: z. B. Block füllen, Paare zusammen).
* **Aktion:** Ticket erzeugen (`Ticket(currentState=OUTSIDE, revoked=false)`), `ShareGuard` anlegen.
* **Zustellung:** E‑Mail/WhatsApp „Dein Ticket“ mit Link zu **/my-qr**.

**API:** `POST /api/admin/invitations/approve` (bulk).
**DB‑Effekt:** `Invitation.approved*`, `Ticket.*` (+ optional `Seat`‑Relation).

---

## 6) Ticket & QR (Gast)

**UI:** `/my-qr`

* Zeigt **rotierendes** QR‑Token (nach `Event.rotateSeconds`).
* **Gerätebindung:** beim ersten Abruf `deviceId` generieren und im Token mitschicken → `Ticket.deviceBoundKey` setzen.
* **Sharing‑Schutz:** Mismatch → `ShareGuard.failCount++` + Sperrfenster `blockedUntil`.

**API:** `POST /api/public/tickets/mint-qr` (für App/Web)
**Token:** RS256‑signiert, Claims: `ticketId`, `eventId`, `direction`, `deviceId?`, `exp`.

---

## 7) Einlass/Auslass (Security)

**UI:** `/scan` (Rolle **security**/**admin**)

* Kamera‑Scanner, Gate‑Auswahl, **grün** bei Erfolg, **rot** mit Grund bei Fehler.
* Anzeige: **Platz** (`seat.section/row/number`), Name optional.
* Realtime‑Update‑Board via WebSocket.

**API:** `POST /api/scan`
**Prüft:** Signatur/`exp`, `revoked`, `allowReEntry`, Doppel‑States, Gerätebindung, Rate‑Limit.
**DB‑Effekt:** `Ticket.currentState` toggelt (INSIDE⇄OUTSIDE), `ScanLog`‑Eintrag.

---

## 8) Reporting & Exporte (Admin)

**UI:** `/events/[eventId]/reports`

* RSVP‑Statistiken, Ankunftszeiten, Peak‑Load, „No‑Shows“.
* **Exporte:** CSV für `ScanLog`, `Invitation` (mit Status), Sitzlisten.

**API:** `/api/admin/reports/*` (nur lesen), `/api/admin/invitations/export`.

---

## Edge Cases & Policies

* **Gerät verloren / Wechsel**: Self‑Service „Gerät abkoppeln“ mit E‑Mail‑Verifikation oder Admin‑Reset (`deviceBoundKey=null`, `ShareGuard` zurücksetzen).
* **Re‑Entry off**: Wenn `allowReEntry=false`, nach OUTSIDE ist erneuter INSIDE blockiert.
* **Token‑Missbrauch**: mehrfache Fehlversuche → `blockedUntil` (z. B. 10 Minuten) + Hinweis am Gate.
* **Ticket widerrufen**: `Ticket.revoked=true` → sofortige Sperre.
* **Mehrere Einladungen**: Gast sieht konsolidierte Liste unter **/me/events** (per `GuestProfile.userId`).

---

## Mindest‑Konfiguration (Prod‑.env)

```
# Web / Next
NEXT_PUBLIC_BASE_URL=https://checkpoint.dein-domain.tld
NEXT_PUBLIC_WS_URL=wss://checkpoint.dein-domain.tld

# DB/Redis
DATABASE_URL=postgresql://<user>:<pass>@<pg-host>:5432/eventdb?schema=public
REDIS_URL=rediss://<redis-host>:6379

# Keycloak
KC_BASE_URL=https://auth.dein-domain.tld
KC_REALM=checkpoint
KC_CLIENT_ID=checkpoint-guest
KC_ADMIN_CLIENT_ID=checkpoint-admin

# JWT/QR (RS256)
JWT_PRIVATE_KEY_PATH=/run/secrets/qr_jwt_private.pem
JWT_PUBLIC_KEY_PATH=/run/secrets/qr_jwt_public.pem
```

---

## Go‑Live Checkliste

1. **Redirect URIs** in Keycloak auf Prod‑Domain.
2. **Secrets** über Orchestrator‑Secrets, keine Klartext‑Keys im Image.
3. **CSP/Headers** (X‑Frame‑Options, Referrer‑Policy, COOP/COEP wo sinnvoll).
4. **404/5xx Pages** gebrandet, Support‑Kontakt sichtbar.
5. **Backups & Restore‑Test** (DB), **Load‑Test** (Scan‑Spitzen, 5–10/s).
6. **Monitoring**: Alert bei `500`‑Rate > 1%, DB‑Latenz, WS‑Disconnect‑Rate.
7. **Datenschutz**: Impressum/Privacy, Einwilligungen (Messaging), Löschroutine.

---

## Mapping auf bestehende Projektstruktur (Pfad‑Hinweise)

* **Admin‑UIs**: `/app/(admin)/events/*`, `/app/(admin)/invitations/*`, `/app/(admin)/reports/*`
* **Gast‑UIs**: `/app/invite/page.tsx`, `/app/my-qr/page.tsx`, `/app/me/events/page.tsx`
* **Security**: `/app/scan/page.tsx`
* **APIs**: `/app/api/admin/*`, `/app/api/public/*`, `/app/api/scan/route.ts`
* **Server/Realtime**: `/server.js`, `/src/lib/ws-server.js`, `/src/lib/ws.ts`
* **Prisma**: `/prisma/schema.prisma`, Seeds unter `/prisma/*.ts`

---

## Nächste Schritte (Implement priorisiert)

1. **Events‑UI** (Liste + Wizard) – `/app/(admin)/events`.
2. **Import‑UI** mit Mapping/Preview/Fehlerreport – `/app/(admin)/events/[id]/guests/import`.
3. **Invite‑Liste** mit Mehrfachversand (WABA + Mail) – `/app/(admin)/events/[id]/invitations`.
4. **Approval + Seat‑Zuweisung** – Bulk‑Aktionen.
5. **/my-qr** polieren (Rotation, Device‑Binding UI‑Hint).
6. **/scan** finalisieren (UI‑States, Gate‑Switch, Sound‑Feedback, Offline‑Fallback).
7. **Reports/Export**.

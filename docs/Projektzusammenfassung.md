
# Checkpoint – Projektzusammenfassung & Wissensstand (Stand: 13.08.2025)

> **Zweck:** Merkhilfe für zukünftige Chats, damit wir ohne erneutes Datei-Hochladen direkt anknüpfen können. Enthält Architektur, Stack, Dienste, Datenmodell, Auth, Routen/Pages und deinen gewünschten Workflow-Mapping.

---

## 1) Projektziel & Workflow (Soll)

**Ziel:** QR-basierte Einlasslösung für Events (mobile-first, Apple-Style UI).

**Geplanter Workflow:**

1. **CSV-Import** (oder Einzel-Erfassung) von Gästen.
2. **Admin-Tabelle** mit Checkboxen → Auswahl von Gästen.
3. **Versand per WhatsApp-Link** zur WebApp (optional App-Store Link zusätzlich). Link führt zu personalisierter Seite → **Anmeldung/Registrierung** (Keycloak **guest**), **Profil-/Datenpflege** und **RSVP**.
4. Admin-UI zeigt **Interesse/RSVP-Status** (zugesagt/abgelehnt/offen) + Filter.
5. **Approval** → **Ticket/QR** für jeweilige Accounts erzeugen & zustellen (Anti-Sharing aktiv).
6. **Event-Tag:** Security-App (Rolle **security**) scannt **rein/raus**. System kennt **Platz/Seat**. **INSIDE/OUTSIDE** wird protokolliert; Re-Entry laut Event-Setting möglich.

> **Anti-Sharing:** Gerätebindung + ShareGuard (Fail-Counts, Sperrfenster) + rotierende Tokens.

---

## 2) Tech-Stack & Laufzeitumgebung

* **Framework:** Next.js 15 (App Router), TypeScript/TSX, MUI.
* **DB/ORM:** PostgreSQL + Prisma.
* **Auth:** Keycloak 25 (Realm `checkpoint`), Rollen: `admin`, `security`, `guest`.
* **Cache/Guards:** Redis.
* **Realtime:** WebSockets (Node `ws`), Broadcasts für Scan-Updates.
* **QR/Tokens:** `qrcode`, `jsonwebtoken`; Ticket-Image-Renderer vorhanden.
* **Native Shell:** Capacitor (optional) für iOS/Android.

**Ports (lokal):** Web: `3000`, Keycloak: `8080`, App-DB (PG16): `5433`, KC-DB (PG16): `5432`, Redis: `6379`.

---

## 3) Docker-Compose (Services)

* **keycloak-db:** Postgres 16, DB `keycloakdb` (User `keycloak`).
* **app-db:** Postgres 16, DB `eventdb` (User `eventuser`) → Port-Forward `5433:5432`.
* **redis:** Redis 7, AOF aktiviert.
* **keycloak:** Keycloak 25, `start-dev --import-realm`, lädt `realm.json`.

> **Hinweis:** `.env` enthält Variablen (DB-Passwörter, `DATABASE_URL`, `REDIS_URL`, Pfade für JWT-Schlüssel). **Keine Secrets** in dieser Merkhilfe gespeichert.

---

## 4) Keycloak-Konfiguration

**Realm:** `checkpoint`

**Rollen (realm):** `admin`, `security`, `guest`

**Clients:**

* `checkpoint-admin` (Web, Public, PKCE S256) → Admin UI.
* `checkpoint-guest` (Web, Public, PKCE S256) → Gast-Self-Service/RSVP.
* `checkpoint-scanner` (Native, Public, PKCE) → Scanner-App (iOS/Android, Deep Link/Expo Redirect).
* `checkpoint-api` (Confidential, Service Accounts) → Server-zu-Server.

**Dev-User:** `admin`, `security`, `guest` (mit Test-Passwörtern – nicht hier hinterlegt).

**Redirect/WebOrigins:** lokal `http://localhost:3000` (und 127.0.0.1).

---

## 5) Datenmodell (Prisma)

**Enums:**

* `InvitationStatus { PENDING, ACCEPTED, DECLINED, CANCELED }`
* `PresenceState { INSIDE, OUTSIDE }`
* `RsvpChoice { YES, NO }`

**Modelle (Kurzüberblick):**

* **User**: Keycloak-gebundene Nutzer (admin/security/guest), Relationen zu GuestProfile, ScanLog, „approvedInvitations“.
* **Event**: Name, Start/Ende, `allowReEntry`, `rotateSeconds` (QR-Rotation), Relationen `seats`, `invitations`, `tickets`, `scanLogs`.
* **Seat**: optionale Sitzangaben (section/row/number/note), 1:1 optional mit Ticket.
* **GuestProfile**: Kontaktdaten des Gasts, optional Verknüpfung zu `User`, Relationen zu `Invitation`.
* **Invitation**: Status + Zeitstempel, **RSVP** (`rsvpChoice`, `rsvpAt`), **Approval** (`approved`, `approvedAt`, `approvedBy`), **Plus-Ones** via `invitedByInvitationId` & `invitedChildren`, optional `shareCode`, 1:1 zu `Ticket`.
* **Ticket**: `currentState` (INSIDE/OUTSIDE), `deviceBoundKey`, `revoked`, `lastRotatedAt`, 1:1 zu Invitation, optional 1:1 zu Seat, Relation `scanLogs`, 1:1 `shareGuard`.
* **ScanLog**: Ticket/Event/Benutzer, `direction` (INSIDE/OUTSIDE), `verdict`, `gate`, `deviceHash`, Zeitstempel.
* **ShareGuard**: pro Ticket Fail-Counts, Blockfenster, Gründe.

> Das Modell deckt RSVP, Approval, Sitzplätze, Gerätebindung, Token-Rotation, Logs und Anti-Sharing ab.

---

## 6) App-Routen & APIs (Auswahl)

**Pages (App Router):**

* `/scan` – Scanner-UI (Security-Rolle), Live-Feedback über WebSocket.
* `/rsvp` – Gast-RSVP/Interesse + Datenpflege.
* `/qr`, `/my-qr` – QR-Anzeige/Download für eingeloggte Gäste.
* `/login` – Login/Callback Flows.
* `/invite` – Einladungsselfservice / Link-Landung.
* `/invitations` – Admin-Liste;

  * `/invitations/responses` – Auswertung/Status;
  * `/invitations/responses/client` – Client-Ansicht.

**APIs (route.ts, exemplarisch):**

* `/api/scan` – **Node.js Runtime**: prüft QR-JWT, Ticket/ShareGuard, schreibt `ScanLog`, broadcastet via WebSocket; `verdict` & `direction`.
* (weitere `route.ts` in mehreren Ordnern vorhanden für Tickets/Invites/QR/RSVP – Details in Codebasis; diese Merkhilfe fokussiert auf Hauptfluss.)

**Server/Realtime:**

* `server.js` startet Next + `ws-server.js` (WebSocket-Hub).
* `ws.ts` Client-Helfer; `broadcastScanUpdate` wird nach erfolgreichen/fehlgeschlagenen Scans aufgerufen.

**QR/Token/Images:**

* `qrcode.ts` – Erzeugt QR auf Basis signierter Payload (ticketId, eventId, direction, deviceId?, `exp`).
* `ticketImage.ts` – Rendern/Komponieren eines Ticket-Images (Branding möglich).
* `rsvp.ts` – Hilfsroutinen für Zusagen/Absagen & Statuspflege.

**Seeds:**

* `prisma/seed.ts`, `prisma/seed-demo.ts` – erstellen z. B. „Sommer Gala 2025“, Seats usw.

---

## 7) Status vs. Workflow – Mapping

* **CSV-Upload → Invitation/GuestProfile**: abbildbar mit vorhandenen Modellen; Admin-UI fehlt noch (Import, Mapping, Fehlerreport).
* **WhatsApp-Links**: personalisierte, signierte bzw. `shareCode`-basierte URLs → auf `/invite`/`/rsvp` führen; AppStore-Link optional dazu.
* **RSVP/Profilpflege**: `rsvpChoice`, `rsvpAt` in Invitation; User kann Daten im `GuestProfile` pflegen.
* **Approval**: Felder vorhanden (`approved*` + `approvedBy`). Danach **Ticket** erzeugen.
* **QR & Anti-Sharing**: Ticket mit `deviceBoundKey`, rotierende JWTs (`rotateSeconds` per Event), `ShareGuard` gegen Mehrfachnutzung.
* **Security-Scan**: `/api/scan` schreibt `ScanLog`, toggelt `PresenceState`, zeigt Sitz (`ticket.seat`) an, WebSocket-Broadcast an UI.

---

## 8) Nächste sinnvolle Implementierungsschritte (kurz)

1. **CSV-Importer** (Server Action/API) + Admin-UI (Tabellenansicht, Checkbox-Bulk).
2. **Invite-Link-Generator** (pro Invitation), WhatsApp-Sender (Button → `wa.me`/Share API, später evtl. Twilio/360dialog).
3. **RSVP-Form** mit Keycloak-Login-Flow, Validierungen, Idempotenz.
4. **Approval-UI** + Ticket-Erzeugung, QR-Renderer, Zustellung (E-Mail/WhatsApp/Download).
5. **Scanner-UI-Feinschliff**: Erfolg=Grün, Fehler=Rot + Popup mit Grund; Live-Logs.
6. **ShareGuard-Policy** (Rate-Limits, Blockzeiten) + **Token-Rotation** Job/Scheduler.
7. **Auditing/Exports** (CSV der Responses/ScanLogs) und **Seat-Overlay** im UI.

---

## 9) Annahmen & Nicht gespeicherte Secrets

* Diese Merkhilfe speichert **keine** Passwörter/Secrets aus `.env`/`realm.json`.
* Lokale Ports, Client-IDs, Rollen, Modellstruktur und vorhandene Dateien/Seiten sind hier konsolidiert.

---

## 10) So nutzt du diese Merkhilfe im Chat

* Verweise einfach auf **„Checkpoint Wissensstand 13.08.2025“** oder schreibe z. B.:

  * „CSV-Importer bauen wie in der Merkhilfe Abschnitt 8.1“
  * „Scanner-Fehlerpopup (rot) umsetzen – Abschnitt 8.5“
  * „Anti‑Sharing Policy schärfen – Abschnitt 8.6“

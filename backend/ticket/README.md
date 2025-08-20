# 🎟️ Checkpoint – Ticket Service

Microservice für **Ticket-Erstellung, QR-Token Rotation und Ticket-Images** innerhalb des Checkpoint-Systems.

---

## 📖 Beschreibung

Der **Ticket-Service** verwaltet Event-Tickets, generiert **kurzlebige JWT-QRs** und liefert diese als **QR-Code** oder **SVG/PNG-Bild** aus.
Admins können Tickets zu bestätigten Einladungen minten, Security kann QR-Tokens prüfen, Gäste bekommen ihr Ticket als QR-Code zugesendet.

**Features:**

* Ticket „minten“ aus einer **Invitation (ACCEPTED)**
* Kurzlebige **JWTs** mit Event/Seat/State
* **QR-Code & SVG** Ausgabe
* Optional: **Device-Bindung** im Token
* Keycloak-Rollenprüfung (`admin`/`security`) oder Dev-Bypass (`DISABLE_AUTH`)

---

## 🛠 Tech Stack

* **Framework**: NestJS (Express)
* **DB/ORM**: PostgreSQL, Prisma
* **Auth**: Keycloak (OIDC), JOSE für JWT
* **QR**: `qrcode` (DataURL), eigenes SVG-Template
* **Lang**: TypeScript (ESM, Node 20)

---

## 📂 Ordnerstruktur

```
services/ticket
├── Dockerfile
├── package.json
├── prisma
│   └── schema.prisma
├── src
│   ├── main.ts
│   ├── modules
│   │   └── ticket
│   │       ├── dto
│   │       │   ├── mint-ticket.dto.ts
│   │       │   ├── rotate-token.dto.ts
│   │       │   └── send-ticket.dto.ts
│   │       ├── ticket.controller.ts
│   │       ├── ticket.module.ts
│   │       └── ticket.service.ts
│   ├── shared
│   │   ├── auth.guard.ts
│   │   └── prisma.service.ts
│   └── utils
│       ├── jwt.util.ts
│       ├── qrcode.util.ts
│       └── ticket-image.util.ts
└── tsconfig.json
```

---

## 🔄 Workflow

1. **Mint Ticket**
   `POST /tickets/mint`
   → Ticket wird erstellt (nur wenn Invitation = `ACCEPTED`)

2. **Rotate JWT**
   `POST /tickets/:id/rotate`
   → Gibt neues QR-Token zurück (gültig z. B. 60s)

3. **Ticket abrufen**
   `GET /tickets/:id`

4. **Ticket-Bild (QR)**
   `GET /tickets/:id/image.png`
   → Liefert SVG mit QR-Code + Event/Seat/Gast-Info

5. **Ticket versenden (Stub)**
   `POST /tickets/send`

---

## 🧪 API (Beispiele)

### Mint Ticket

```http
POST /tickets/mint
Authorization: Bearer <token>
Content-Type: application/json

{
  "invitationId": "inv_123",
  "seatId": "seat_456"
}
```

### Rotate Token

```http
POST /tickets/ticket_123/rotate
Authorization: Bearer <token>
Content-Type: application/json

{
  "ttlSeconds": 60,
  "deviceHash": "hash123"
}
```

### Get Ticket

```http
GET /tickets/ticket_123
Authorization: Bearer <token>
```

### Ticket Image

```http
GET /tickets/ticket_123/image.png
```

---

## 🚀 Setup & Entwicklung

```bash
# ins Service-Verzeichnis
cd services/ticket

# Abhängigkeiten installieren
npm install

# Prisma generieren
npm run prisma:generate

# DB Migration (falls nötig)
npm run prisma:dev

# Dev-Server starten
npm run dev
```

Der Service läuft dann auf `http://localhost:4002`.

---

## 🔐 Sicherheit

* **JWT**: Enthält `ticketId`, `eventId`, `state`, `seat`, `allowReEntry`
* **Rotation**: Token gültig für `rotateSeconds` (aus Event oder .env)
* **Keycloak**: Rollen `admin`, `security` via `KEYCLOAK_JWKS_URL`
* **Dev-Modus**: `DISABLE_AUTH=true` erlaubt ungeschützte Tests

---

## 📌 ToDo / Erweiterungen

* [ ] Versand via E-Mail/WhatsApp (separater Messaging-Service)
* [ ] PDF/Wallet-Pass Export
* [ ] Offline-Scannen (lokale JWT-Verifikation)
* [ ] Rate Limits / ShareGuard API anbinden

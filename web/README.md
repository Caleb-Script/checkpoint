# 🛂 Checkpoint – Gästeverwaltung mit QR-Codes

Mobile-first WebApp & App (via Capacitor) für Einladungen, RSVP, QR-Tickets und Security-Scanning – in Apple-ähnlichem Look & Feel (MUI).

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![MUI](https://img.shields.io/badge/MUI-5-007fff?logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Keycloak](https://img.shields.io/badge/Auth-Keycloak-73498C)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Beschreibung
**Checkpoint** organisiert Events mit sicheren QR-Tickets:

- **Einladungen** versenden (CSV oder einzeln)
- **RSVP** (Annehmen/Ablehnen) ohne Account, leichte Auto-Registrierung (Name, optional Mail/Tel)
- **Tickets** ohne Verfallsdatum (nur QR-Token rotiert)
- **Security-Scan** (IN/OUT) + **Live-Status**
- **Platzzuweisung** (Seat) im Ticket gespeichert
- **Mobile-first** UI (MUI), ideal für iOS/Web; App via **Capacitor**

---

## 🛠 Tech Stack
**Frontend**: Next.js 15 (App Router), TypeScript, MUI 5  
**Backend**: Next.js API Routes, Node runtime  
**Auth**: Keycloak (OIDC), eigene Login-API (Token-Austausch), Cookies  
**DB**: PostgreSQL 15, Prisma ORM  
**QR**: dynamische JWTs + `qrcode` (Data-URL)  
**WS**: Live-Updates via `ws` (Ping/Pong Heartbeat)  
**Mobile**: Capacitor (iOS/Android), WebDir `out`  
**Dev**: Docker-Compose (Keycloak, Postgres), Postman Tests

---

## 📂 Ordnerstruktur
```
checkpoint/
├── compose
│   ├── docker-compose.yml
│   └── import
│       └── realm.json
├── docs
│   ├──  Verzeichnisstruktur.md
│   ├── init-prisma.md
│   ├── Next.js Struktur (App Router).md
│   └── Test.md
├── extras
│   └── test.csv
├── package.json
└── web
    ├── android
    ├── capacitor.config.json
    ├── eslint.config.mjs
    ├── ios
    ├── lib
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── prisma
    │   ├── migrations
    │   ├── schema.prisma
    │   └── seed.ts
    ├── public
    ├── README.md
    ├── scripts
    │   └── seed-demo.ts
    ├── server.js
    ├── src
    │   ├── app
    │   │   ├── api
    │   │   │   ├── admin
    │   │   │   │   └── ticket
    │   │   │   │       └── mint
    │   │   │   │           └── route.ts
    │   │   │   ├── auth
    │   │   │   │   ├── diag
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── login
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── logout
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── me
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── refresh
    │   │   │   │       └── route.ts
    │   │   │   ├── invitations
    │   │   │   │   ├── [id]
    │   │   │   │   │   └── link
    │   │   │   │   │       └── route.ts
    │   │   │   │   ├── approve
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── import
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── reject
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── responses
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── route.ts
    │   │   │   │   └── share
    │   │   │   │       └── route.ts
    │   │   │   ├── invite
    │   │   │   │   └── claim
    │   │   │   │       └── route.ts
    │   │   │   ├── my-qr
    │   │   │   │   └── route.ts
    │   │   │   ├── rsvp
    │   │   │   │   ├── accept
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── decline
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── route.ts
    │   │   │   ├── scan
    │   │   │   │   └── route.ts
    │   │   │   ├── security
    │   │   │   │   └── logs
    │   │   │   │       └── route.ts
    │   │   │   ├── tickets
    │   │   │   │   ├── image
    │   │   │   │   │   └── [ticketId].png
    │   │   │   │   │       └── route.ts
    │   │   │   │   ├── qr
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── send
    │   │   │   │       └── route.ts
    │   │   │   └── ws-status
    │   │   │       └── route.ts
    │   │   ├── favicon.ico
    │   │   ├── globals.css
    │   │   ├── invitations
    │   │   │   ├── approve
    │   │   │   ├── page copy.tsx
    │   │   │   ├── page.tsx
    │   │   │   └── responses
    │   │   │       ├── client
    │   │   │       │   └── page.tsx
    │   │   │       └── page.tsx
    │   │   ├── invite
    │   │   │   └── page.tsx
    │   │   ├── layout.tsx
    │   │   ├── login
    │   │   │   └── page.tsx
    │   │   ├── my-qr
    │   │   │   └── page.tsx
    │   │   ├── page copy.tsx
    │   │   ├── page.module.css
    │   │   ├── page.tsx
    │   │   ├── providers.tsx
    │   │   ├── qr
    │   │   │   ├── page copy.tsx
    │   │   │   └── page.tsx
    │   │   ├── rsvp
    │   │   │   └── page.tsx
    │   │   ├── scan
    │   │   │   └── page.tsx
    │   │   ├── security
    │   │   │   └── page.tsx
    │   │   └── tickets
    │   │       └── send
    │   │           └── page.tsx
    │   ├── components
    │   │   └── AppShell.tsx
    │   ├── context
    │   │   └── SessionContext.tsx
    │   └── lib
    │       ├── keycloak.ts
    │       ├── prisma.ts
    │       ├── qrcode.ts
    │       ├── rsvp.ts
    │       ├── ticketImage.ts
    │       ├── ws-server.js
    │       └── ws.ts
    └── tsconfig.json
```

---

## 🔄 Workflow (High-level)
1. **Admin → Einladung** (PENDING)  
   `POST /api/admin/invitations`  
   Optional: Link generieren `/api/invitations/:id/link` (RSVP-Token)

2. **Gast → RSVP**  
   Accept: `POST /api/rsvp/accept` (Name, optional Mail/Tel)  
   Decline: `POST /api/rsvp/decline`

3. **Admin → Ticket minten**  
   `POST /api/admin/tickets/mint` (nur wenn ACCEPTED)

4. **Gast → Mein QR**  
   `POST /api/my-qr` (rotierender Token; Richtung IN/OUT)

5. **Security → Scan**  
   `POST /api/scan` (State wechselt INSIDE/OUTSIDE, Live-Broadcast)

---

## 🧪 API (Kurzreferenz für Postman)
**Auth**
- `POST /api/auth/login` { username, password }
- `GET  /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

**Admin**
- `POST /api/admin/invitations`
- `GET  /api/invitations/:id/link`
- `POST /api/admin/tickets/mint`

**RSVP**
- `POST /api/rsvp/accept`
- `POST /api/rsvp/decline`

**Ticket/Scan**
- `POST /api/my-qr`
- `POST /api/scan`

---

## 🚀 Setup & Entwicklung
```bash
# Abhängigkeiten
cd web
npm install

# Prisma & DB
npx prisma generate
npx prisma migrate dev

# Seed (Demo-Event/Ticket)
npx tsx scripts/seed-admin-ticket.ts

# Dev-Server
npm run dev
# oder mit WS-Server
node server.js
```

---

## 🔴 Live-Status (WebSocket)
- Server: `src/lib/ws-server.ts` mit Ping/Pong Heartbeat  
- Client: AppShell verbindet zu `NEXT_PUBLIC_WS_URL`  
- Broadcast: `/api/scan` sendet `scan-log` an alle Clients

---

## 🔐 Sicherheit
- JWT im QR ist **kurzlebig** (z. B. 60s)  
- Ticket selbst hat **kein Verfallsdatum**  
- Optional: Device-Bindung, Gate-Checks, Rate Limits

---

## 📌 ToDo / Ideen
- [ ] Admin-UI: Sitzplan-Editor  
- [ ] Gast: Selbst-Einladungen  
- [ ] Offline-Modus fürs Scannen  
- [ ] Mehrsprachigkeit (de/en)  
- [ ] Audit/Export (CSV, PDF)  
- [ ] E-Mail/WA Templates  
- [ ] E2E Tests

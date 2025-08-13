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
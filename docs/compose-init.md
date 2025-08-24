# Ein Postgres-Container für alle Microservices (mehrere *Datenbanken*)

Ziel: **Nur ein** PostgreSQL-Container in `compose/docker-compose.yml`, aber **getrennte Datenbanken** für jeden Service (`event`, `invitation`, `ticket`, `auth`, `keycloak`). Jeder Microservice behält eigene Prisma-Instanz und Migrationen, verbindet sich jedoch in denselben Container – mit **eigenem DB-Namen** (und optional eigenem DB-User).

> Vorteil: saubere Trennung & Ownership je Service, keine Cross-Schema-Komplexität in Prisma, kein Port‑Chaos, nur **eine** Persistenz. Cross‑Service-Referenzen laufen über IDs/Ereignisse, **keine** DB‑FKs zwischen Services (Microservice-Best‑Practice).

---

## 1) Dateien & Pfade

**A) Compose:**

* **`/compose/docker-compose.yml`** – Startet `postgres` (+ optional pgAdmin)
* **`/compose/initdb/00-create-databases-and-users.sql`** – Legt beim ersten Start DBs & User an

**B) Service-Configs (Beispielverzeichnis):**

* `backend/event/.env`
* `backend/invitation/.env`
* `backend/ticket/.env`
* `backend/auth/.env`

> Passe die tatsächlichen Service-Pfade an dein Repo an.

---

## 2) `compose/docker-compose.yml` (komplette Datei)

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: checkpoint-pg
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${APP_DB_PASSWORD}
      POSTGRES_DB: postgres
      TZ: Europe/Berlin
      # Für init-Skripte, damit wir das Keycloak-Passwort setzen können
      KEYCLOAK_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    ports:
      - "5433:5432"   # Host:5433 → Container:5432 (passt zu deinen 5433-URLs)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      retries: 5
    volumes:
      - type: bind
        source: ../volumes/postgres/app/data
        target: /var/lib/postgresql/data
      - type: bind
        source: ../volumes/postgres/app/initdb
        target: /docker-entrypoint-initdb.d
    networks:
      - checkpoint-net

  pgadmin:
    image: dpage/pgadmin4:8
    container_name: checkpoint-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local
      PGADMIN_DEFAULT_PASSWORD: admin
      TZ: Europe/Berlin
    ports:
      - "8081:80" # http://localhost:8081
    depends_on:
      - postgres
    networks:
      - checkpoint-net

  redis:
    image: redis:7
    container_name: checkpoint-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - checkpoint-net

  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    container_name: keycloak_server
    command: start-dev --import-realm
    depends_on:
      pg:
        condition: service_healthy
    ports:
      - "8080:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_DB_URL_HOST: postgres           # Hostname im Compose-Netz
      KC_DB_URL_PORT: 5432
      KC_DB_URL_DATABASE: keycloakdb
      KC_HEALTH_ENABLED: "true"
      KC_METRICS_ENABLED: "false"
    volumes:
      - type: bind
        source: ../volumes/keycloak/import
        target: /opt/keycloak/data/import
    networks:
      - checkpoint-net

networks:
  checkpoint-net:
    name: checkpoint-net
```

---

## 3) `compose/initdb/00-create-databases-and-users.sql` (komplette Datei)

> Wird **nur beim ersten Start** (frisches Volume) ausgeführt.

```sql
-- Rollen/Benutzer idempotent anlegen
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'event_user') THEN
    CREATE ROLE event_user LOGIN PASSWORD 'event_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'invitation_user') THEN
    CREATE ROLE invitation_user LOGIN PASSWORD 'invitation_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ticket_user') THEN
    CREATE ROLE ticket_user LOGIN PASSWORD 'ticket_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'auth_user') THEN
    CREATE ROLE auth_user LOGIN PASSWORD 'auth_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'keycloak') THEN
    CREATE ROLE keycloak LOGIN PASSWORD 'changeme'; -- wird in 01-set-keycloak-password.sh überschrieben
  END IF;
END $$;

-- Datenbanken anlegen (inkl. Shadow-DBs für Prisma Migrate)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'eventsdb') THEN
    CREATE DATABASE eventsdb OWNER event_user;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'eventsdb_shadow') THEN
    CREATE DATABASE eventsdb_shadow OWNER event_user;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'invitationsdb') THEN
    CREATE DATABASE invitationsdb OWNER invitation_user;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'invitationsdb_shadow') THEN
    CREATE DATABASE invitationsdb_shadow OWNER invitation_user;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ticketsdb') THEN
    CREATE DATABASE ticketsdb OWNER ticket_user;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ticketsdb_shadow') THEN
    CREATE DATABASE ticketsdb_shadow OWNER ticket_user;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authdb') THEN
    CREATE DATABASE authdb OWNER auth_user;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authdb_shadow') THEN
    CREATE DATABASE authdb_shadow OWNER auth_user;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloakdb') THEN
    CREATE DATABASE keycloakdb OWNER keycloak;
  END IF;
END $$;
```

### 3.1) `compose/initdb/01-set-keycloak-password.sh` (komplette Datei)

> Nutzt die Umgebungsvariable `KEYCLOAK_DB_PASSWORD` aus dem `pg`‑Service, damit Keycloak sich mit dem gewünschten Passwort verbinden kann.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Diese Variablen werden vom Postgres-Container geerbt
: "${POSTGRES_USER:=postgres}"
: "${KEYCLOAK_DB_PASSWORD:?KEYCLOAK_DB_PASSWORD not set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  ALTER ROLE keycloak WITH PASSWORD '${KEYCLOAK_DB_PASSWORD}';
EOSQL

echo "[initdb] Keycloak-Passwort gesetzt."
```

> **Wichtig:** Datei ausführbar machen (`chmod +x ../volumes/postgres/app/initdb/01-set-keycloak-password.sh`).

> **Passwörter/Benutzer** sind Dev‑Defaults. In echten Deployments über `.env`/Secrets setzen.

---

## 4) `.env` je Microservice (komplette Beispiele)

> **Hinweis Host/Container:**
>
> * Wenn deine Services **außerhalb** von Docker laufen (z. B. `next dev` lokal), nutze `localhost:5433`.
> * Wenn ein Service **im selben Compose** läuft, nutze Host `pg:5432`.

### `backend/event/.env`

```dotenv
# Event-Service (lokal)
DATABASE_URL="postgresql://event_user:event_pass@localhost:5433/eventsdb?schema=public"
SHADOW_DATABASE_URL="postgresql://event_user:event_pass@localhost:5433/eventsdb_shadow?schema=public"
```

### `backend/invitation/.env`

```dotenv
# Invitation-Service (lokal)
DATABASE_URL="postgresql://invitation_user:invitation_pass@localhost:5433/invitationsdb?schema=public"
SHADOW_DATABASE_URL="postgresql://invitation_user:invitation_pass@localhost:5433/invitationsdb_shadow?schema=public"
```

### `backend/ticket/.env`

```dotenv
# Ticket-Service (lokal)
DATABASE_URL="postgresql://ticket_user:ticket_pass@localhost:5433/ticketsdb?schema=public"
SHADOW_DATABASE_URL="postgresql://ticket_user:ticket_pass@localhost:5433/ticketsdb_shadow?schema=public"
```

### `backend/auth/.env`

```dotenv
# Auth-Service (lokal)
DATABASE_URL="postgresql://auth_user:auth_pass@localhost:5433/authdb?schema=public"
SHADOW_DATABASE_URL="postgresql://auth_user:auth_pass@localhost:5433/authdb_shadow?schema=public"
```

### (optional) Varianten für **Container‑Betrieb** derselben Services

```dotenv
# Hostname im Compose-Netz wäre dann 'pg' und Port 5432
DATABASE_URL="postgresql://event_user:event_pass@pg:5432/eventsdb?schema=public"
SHADOW_DATABASE_URL="postgresql://event_user:event_pass@pg:5432/eventsdb_shadow?schema=public"
```

### `compose/.env` (komplette Datei)

```dotenv
# ---------------------------
# Keycloak DB Einstellungen
# ---------------------------
KEYCLOAK_DB_PASSWORD=supersecret
KEYCLOAK_ADMIN_PASSWORD=admin

# ---------------------------
# App DB Einstellungen
# ---------------------------
APP_DB_PASSWORD=postgres

# ---------------------------
# Prisma: Beispiel (lokaler Dev)
# ---------------------------
# DATABASE_URL Beispielsweise im Event-Service (siehe dessen .env)
# DATABASE_URL=postgresql://event_user:${APP_DB_PASSWORD}@localhost:5433/eventsdb?schema=public

# ---------------------------
# Redis
# ---------------------------
REDIS_URL=redis://localhost:6379

# ---------------------------
# Sonstiges
# ---------------------------
JWT_PRIVATE_KEY_PATH=./keys/jwtRS256.key
JWT_PUBLIC_KEY_PATH=./keys/jwtRS256.key.pub
```

---

## 5) Prisma `schema.prisma` Header je Service

In **jedem** Microservice befindet sich eine eigene Prisma‑Schema‑Datei, z. B. `backend/ticket/prisma/schema.prisma`:

```prisma
// backend/ticket/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // wichtig für Migrate:
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

// Tipp: Wenn du keine DB‑FKs willst (reine ID-Referenzen), kannst du Relation-Checks auf Prisma heben:
// relationMode = "prisma"
```

> **Hinweis zur Modellierung:** In einem echten Microservice-Schnitt trennst du die Aggregate. Beispiel im `ticket`‑Service: `Ticket`, `ScanLog`, `ShareGuard` mit **plain** `eventId: String`, `invitationId: String` (keine Prisma‑Relation zu Tabellen, die im `event`/`invitation`‑Service liegen). Validierung erfolgt über API‑Calls/Events, nicht via FK.

---

## 6) Start & Migration – Schritt für Schritt

**0. Verzeichnisse vorbereiten**
Lege die Ordner an, falls nicht vorhanden:

```
/compose
/volumes/postgres/app/data
/volumes/postgres/app/initdb
/volumes/keycloak/import
```

Kopiere die oben angegebenen Dateien exakt in diese Pfade.

**1. Postgres & Tools hochfahren**

```bash
# im Ordner: /compose
docker compose --env-file .env up -d pg pgadmin redis
```

**2. Keycloak starten** (nachdem Postgres healthy ist)

```bash
# weiterhin in /compose
docker compose --env-file .env up -d keycloak
```

**3. Migrationen je Service ausführen**

```bash
# Event-Service
cd backend/event
npm install
npx prisma generate
npx prisma migrate dev --name init

# Invitation-Service
cd ../invitation
npm install
npx prisma generate
npx prisma migrate dev --name init

# Ticket-Service
cd ../ticket
npm install
npx prisma generate
npx prisma migrate dev --name init

# Auth-Service
cd ../auth
npm install
npx prisma generate
npx prisma migrate dev --name init
```

**4. (Optional) Seeds pro Service**

```bash
npx tsx prisma/seed.ts
```

---

## 7) Alternative: *Eine* DB, mehrere **Schemas**

Wenn du **eine** Datenbank mit **Schemas pro Service** bevorzugst:

1. Ersetze im `.env` die DB‑Namen durch eine gemeinsame DB (z. B. `checkpointdb`) und hänge `?schema=event` usw. an.
2. Ergänze Init‑SQL um `CREATE DATABASE checkpointdb;` und in jedem Service `CREATE SCHEMA IF NOT EXISTS <service>;`.
3. `DATABASE_URL="postgresql://.../checkpointdb?schema=event"`

> Beachte: Prisma legt die Tabelle `prisma_migrations` **pro Schema** an. Cross‑Schema‑FKs sind weiterhin nicht ratsam. Diese Variante ist praktisch, wenn du Reports/Views über Services hinweg brauchst – bleibt aber ein fortgeschrittener Use‑Case.

---

## 8) Troubleshooting

* **Init‑SQL wird ignoriert**: Volumen `pg_data` war nicht leer. Lösche das Volume (`docker compose down -v`) und starte neu.
* **Migrate blockiert**: Setze `SHADOW_DATABASE_URL` korrekt (eigene Shadow‑DB je Service).
* **Verbindung von Containern**: Innerhalb von Compose heißt der Host **`pg`**, **nicht** `localhost`.
* **Cross‑Service IDs**: Nicht via FK koppeln; über APIs/Events validieren.

---

## 9) TL;DR

Ein Postgres‑Container, viele **Datenbanken**. Jeder Microservice bekommt eigenen DB‑User + DB (+ Shadow‑DB). Prisma pro Service heilt Migrationen sauber ein. Keine Cross‑FKs; IDs + Events reichen. Start: `cd compose && docker compose up -d pg pgadmin`, danach pro Service `npx prisma migrate dev`.

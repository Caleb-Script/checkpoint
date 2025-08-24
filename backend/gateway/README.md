# 🌐 Omnixys Gateway Service

Der `omnixys-gateway-service` ist das zentrale API-Gateway im **OmnixysSphere**-Ökosystem. Es stellt eine einheitliche GraphQL-Schnittstelle bereit und verbindet alle Microservices miteinander – sicher, beobachtbar und skalierbar.

---

## 🚀 Features

* 🔡 Zentrale Authentifizierung & Autorisierung via Keycloak
* 🧹 Federation / GraphQL Stitching für modulare Erweiterung
* 📊 Integriertes Tracing mit OpenTelemetry & Tempo
* 📈 Prometheus-Metriken unter `/metrics`
* 🗾️ Zentrales Logging via Kafka & LoggerPlus
* 🌍 CORS-Handling und Rate-Limiting

---

## 🔧 Technologie-Stack

| Komponente        | Technologie                      |
| ----------------- | -------------------------------- |
| Sprache           | TypeScript                       |
| Framework         | [NestJS](https://nestjs.com/)    |
| Gateway-Layer     | Apollo Gateway / GraphQL Mesh    |
| Authentifizierung | Keycloak (OIDC)                  |
| Observability     | Tempo, Prometheus, Loki, Grafana |
| Logging           | LoggerPlus + Kafka               |
| Port              | `8000`                           |

---

## 🧱 Struktur

```bash
src/
├── modules/
│   └── auth/             # Keycloak-Integration
├── graphql/
│   └── schema.graphql    # Zusammengesetztes Schema
├── services/
│   └── tracing/          # Otel/LoggerPlus
└── main.ts               # Einstiegspunkt
```

---

## ▶️ Schnellstart

```bash
npm install
npm run start
```

Oder via Docker:

```bash
docker build -t omnixys-gateway .
docker run -p 8000:8000 omnixys-gateway
```

---

## 📌 Konfiguration

Umgebungsvariablen `.env`:

```env
PORT=8000
KEYCLOAK_REALM=omnixys
KEYCLOAK_CLIENT_ID=gateway
KEYCLOAK_URL=https://auth.omnixys.com
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
```

---

## 📡 Observability

| Endpunkt           | Beschreibung           |
| ------------------ | ---------------------- |
| `/graphql`         | Haupt-Gateway-Endpunkt |
| `/metrics`         | Prometheus-kompatibel  |
| Kafka Topic (Logs) | `logs.gateway`         |

---

## 🔒 Sicherheit

* 🔐 Authentifizierung über

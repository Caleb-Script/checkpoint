# 🗺️ Seatmap Extractor – Microservice

Ein Microservice, der aus einem **Sitzplan (PDF/PNG/SVG)** eine **strukturierte Sitzplan-JSON** erzeugt, damit du sie direkt in **Checkpoint** (Event-App) importieren kannst. Zusätzlich gibt es eine einfache **Apollo GraphQL**-API inkl. Datei-Upload.

> Ziel: Admin lädt einen Sitzplan hoch → Service extrahiert **Seats** (x/y/width/height, Label wie *A12*, optional Section/Row/Number) → Rückgabe als JSON + optionaler Import in die Checkpoint-DB (über Webhook/Adapter).

---

## ⚙️ Features

* **SVG-Erkennung (beste Qualität)**: Kreise/Rects/Paths + nahestehende Textlabels → Sitz-Objekte
* **PNG-Erkennung (heuristisch)**: OCR (Tesseract) für Labels (z. B. `A12`), Clustering nach Position
* **PDF-Unterstützung**: via `pdftocairo -svg` (Poppler) → erst nach SVG konvertieren, dann wie SVG verarbeiten
* **GraphQL**-API mit Datei-Upload (`graphql-upload`)
* **Validierte Ausgabe** (Zod): `SeatMap` und `Seat` kompatibel zu Checkpoint `Seat`-Modell
* **Optionaler Push** zu Checkpoint (Webhook-URL oder CLI), inkl. Mapping auf `Event.id`
* **Review-Modus**: Auto-Erkennung liefert Rohdaten + Confidence → Admin kann in der App nachkorrigieren

---

## 📦 Struktur

```
/services/seatmap-extractor
├── Dockerfile
├── package.json
├── tsconfig.json
├── src
│   ├── server.ts
│   ├── types.ts
│   ├── utils
│   │   └── geometry.ts
│   ├── lib
│   │   ├── extractFromSvg.ts
│   │   ├── extractFromPng.ts
│   │   └── extractFromPdf.ts
│   ├── adapters
│   │   └── checkpointPush.ts
│   └── graphql
│       ├── schema.graphql
│       └── resolvers.ts
└── README.md (diese Datei)
```

---

## 🚀 Setup & Start

**Voraussetzungen**

* Node.js ≥ 18
* (für PDF) Systemtool **Poppler** (`pdftocairo`). macOS: `brew install poppler`, Ubuntu: `apt-get install poppler-utils`.

**Installation**

```bash
# Im Projekt-Stamm (z. B. /Users/gentlebookpro/Projekte/checkpoint)
# 1) Microservice ablegen:
# -> Ordner services/seatmap-extractor gemäß Struktur erstellen und Dateien einfügen

# 2) Abhängigkeiten installieren
cd services/seatmap-extractor
npm install

# 3) Entwicklung starten (Port 4002 per Default)
npm run dev

# Produktion (Beispiel)
npm run build
npm run start
```

**Docker**

```bash
# Im Ordner services/seatmap-extractor
docker build -t seatmap-extractor:latest .
docker run --rm -p 4002:4002 -e PORT=4002 seatmap-extractor:latest
```

---

## 🔌 GraphQL API

**Endpoint**: `POST http://localhost:4002/graphql`

**Schema (Auszug)**

```graphql
scalar Upload

input ImportOptions {
  eventId: String
  webhookUrl: String
}

type Seat {
  id: String
  label: String
  section: String
  row: String
  number: String
  x: Float
  y: Float
  w: Float
  h: Float
  confidence: Float
}

type SeatMap {
  width: Float
  height: Float
  seats: [Seat!]!
  sourceType: String!
}

type ImportResult {
  ok: Boolean!
  seatCount: Int!
  warnings: [String!]
  pushedTo: String
}

type Query { _health: String! }

# Datei-Upload (PDF/PNG/SVG)
type Mutation {
  importSeatMap(file: Upload!, options: ImportOptions): SeatMap!
  pushToCheckpoint(seatMap: String!, options: ImportOptions!): ImportResult!
}
```

**Beispiel-Mutation (Multipart Upload)**

```graphql
mutation($file: Upload!) {
  importSeatMap(file: $file, options: { eventId: "<EVENT_ID>" }) {
    width
    height
    sourceType
    seats { label x y w h confidence }
  }
}
```

---

## 🔁 Workflow-Empfehlung (mit Checkpoint)

1. **Admin** lädt Sitzplan (SVG bevorzugt) in Seatmap Extractor hoch → erhält `SeatMap` JSON
2. **Review** in Admin-UI: Plätze nachziehen/umbenennen (wir geben `confidence` aus)
3. **Push** in Checkpoint DB: per `pushToCheckpoint` (Webhook) oder via eigenem Admin-Tool Seats anlegen (`Seat` Tabelle mit `eventId`, `section`, `row`, `number`, `note`).
4. In der App **Live-Status** färben (grün/rot) aus `Ticket.currentState` und `Seat.ticket`-Relation.

---

## 🎯 Heuristiken (kurz)

* **SVG**: `circle`/`rect` als Seat-Kandidaten; nächster `text`-Node → Label. Bounding-Box aus Element-Attributen.
* **PNG**: OCR auf binarisierter Version; Labels nach Regex `^[A-Z]{1,2}\d{1,3}$` priorisiert. Clustering (k-NN) zur Gruppierung.
* **PDF**: Konvertiere zu SVG (Seite 1) mit `pdftocairo -svg` → wie SVG.

---

## 🧪 Testdaten

* Lege eine einfache SVG mit Kreisen + Text an („A1“, „A2“…). Ergebnis in Playground prüfen.

---

## ⚠️ Grenzen

* Rein pixelbasierte Pläne ohne klare Labels benötigen manuelles Nachzeichnen.
* PDF-Unterstützung hängt von `pdftocairo` ab.
* OCR ist fehleranfällig – Review Schritt ist vorgesehen.

---

## 📜 Lizenz

MIT

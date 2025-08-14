# /services/seatmap-extractor/Dockerfile
FROM node:20-slim

# Poppler für PDF->SVG
RUN apt-get update && apt-get install -y --no-install-recommends \
  poppler-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY ./src ./src
COPY tsconfig.json ./

# Build (optional – wir starten auch im TSX-Devmodus)
RUN npx tsx --version >/dev/null 2>&1 || npm i -g tsx

ENV PORT=4002
EXPOSE 4002
CMD ["npx", "tsx", "src/server.ts"]

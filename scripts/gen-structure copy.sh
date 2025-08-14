#!/bin/bash
# Nutzung: ./gen-structure.sh user
# Erstellt Verzeichnisse und leere TS-Dateien für Models, Services, Resolver

# Eingabe prüfen
if [ -z "$1" ]; then
  echo "⚠️  Bitte einen Namen angeben! Beispiel:"
  echo "   ./gen-structure.sh user"
  exit 1
fi

NAME="$1"
BASE_DIR="./$NAME"

# Verzeichnisstruktur erstellen
mkdir -p "$BASE_DIR/models/entity"
mkdir -p "$BASE_DIR/models/dto"
mkdir -p "$BASE_DIR/service"
mkdir -p "$BASE_DIR/resolver"

# Leere Dateien anlegen
touch "$BASE_DIR/service/${NAME}-read.service.ts"
touch "$BASE_DIR/service/${NAME}-write.service.ts"
touch "$BASE_DIR/resolver/${NAME}-query.resolver.ts"
touch "$BASE_DIR/resolver/${NAME}-mutation.resolver.ts"

echo "✅ Struktur für '$NAME' erstellt:"
tree "$BASE_DIR"

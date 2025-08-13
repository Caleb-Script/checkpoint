# Test

## Ausführen

``` pwsh
# im Projekt-Root der Webapp:
cd /Users/gentlebookpro/Projekte/checkpoint/web

# tsx installieren (falls noch nicht):
npm i -D tsx

# Prisma Client sicherstellen:
npx prisma generate

# Seed laufen lassen:
npx tsx scripts/seed-demo.ts
```

## Auth testen (cURL)

Wir testen den Custom Login (kein Redirect), speichern Cookies, und prüfen ```/api/auth/me```.

``` bash
# im Web-Ordner bleiben:
cd /Users/gentlebookpro/Projekte/checkpoint/web

# 1) Login (ersetze USER/PASS)
curl -i -c .cookies.txt -b .cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"USER","password":"PASS"}' \
  http://localhost:3000/api/auth/login

# 2) Profil abrufen
curl -i -c .cookies.txt -b .cookies.txt \
  http://localhost:3000/api/auth/me
```

Erwartung: authenticated: true, dein profile, roles, tokenExpiresAt.

## „Mein QR“ holen (API) & Bild sehen (UI)

API (cURL)

``` bash
# Richtung "IN" (Einlass)
curl -i -c .guest-cookies.txt -b .guest-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"direction":"IN","deviceId":"guest-web"}' \
  http://localhost:3000/api/my-qr
````

Erwartung: JSON mit ticketId, eventId, qr (Data‑URL), token (JWT), expiresInSeconds:60.

UI
- Öffne: http://localhost:3000/my-qr
- Du siehst deinen rotierenden QR (läuft runter, auto‑refresh).
- Toggle „Einlass/Auslass“ testet beide Richtungen.




``` bash
curl -i -c .admin-cookies.txt -b .admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"p"}' \
  http://localhost:3000/api/auth/login
  ```

  ```bash
  curl -i -c .guest-cookies.txt -b .guest-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"username":"guest","password":"p"}' \
  http://localhost:3000/api/auth/login
  ````


```bash
# Beispiel: ersetze DEIN_TOKEN_HIER durch den Wert aus /api/my-qr
curl -i -c .admin-cookies.txt -b .admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"cme9u15kb000606k6le8mtqvb"}' \
  http://localhost:3000/api/scan
  ````

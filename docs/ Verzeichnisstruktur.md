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
checkpoint/
├─ docker-compose.yml
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ next.config.mjs
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ invitations/import/route.ts
│  │  │  ├─ invitations/create/route.ts
│  │  │  ├─ invitations/[id]/send/route.ts
│  │  │  ├─ scan/route.ts
│  │  │  └─ seating/assign/route.ts
│  │  ├─ admin/page.tsx
│  │  ├─ guest/page.tsx
│  │  ├─ security/page.tsx
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ AppNav.tsx
│  │  ├─ InvitationTable.tsx
│  │  ├─ QRScanner.tsx
│  │  ├─ SeatMap.tsx
│  │  └─ StatusBadge.tsx
│  ├─ lib/
│  │  ├─ auth.ts
│  │  ├─ db.ts
│  │  ├─ qrcode.ts
│  │  └─ whatsapp.ts
│  ├─ styles/
│  │  └─ globals.css
│  └─ types/
│     └─ invite.ts
├─ public/
│  └─ apple-touch-icon.png
└─ middleware.ts

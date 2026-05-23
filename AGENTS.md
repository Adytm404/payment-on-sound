# AGENTS.md

## Project Overview

Pasound is a QRIS payment generator and financial report web app.

Current stack:

- Frontend: Vite + React + TypeScript
- Styling: Tailwind CSS
- Icons: Lucide CDN from `index.html`
- QR rendering: `qrcode`
- Backend: Express + TypeScript (`server/`)
- Database: MySQL via Prisma
- Auth: JWT + bcrypt
- Payment provider: Pakasir API

The app has been migrated from browser `localStorage` to MySQL-backed API for primary data. Some legacy localStorage helpers still exist in `src/lib/storage.ts` for types/defaults and legacy reset compatibility, but new transaction/settings flow should use backend APIs.

## Important Commands

Run backend:

```bash
npm run dev:server
```

Run frontend:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run Prisma migration:

```bash
npm run prisma:migrate
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Local Environment

Expected `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/pasound"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=3001
FRONTEND_ORIGIN="http://localhost:3000"
VITE_API_BASE_URL="/api"
PYTHON_BIN="py"
EDGE_TTS_VOICE="id-ID-GadisNeural"
TTS_CACHE_DIR="storage/tts"
```

MySQL is expected at:

- host: `localhost`
- database: `pasound`
- user: `root`
- password: empty

Frontend runs on port `3000`.
Backend runs on port `3001`.

Vite has a dev proxy from `/api` to `http://localhost:3001`.

## Prisma Notes

Prisma was pinned/downgraded to `6.19.0` because Prisma 7 required runtime configuration changes and failed with standard `new PrismaClient()`.

Do not upgrade Prisma to v7 unless also updating Prisma runtime/client initialization.

Schema path:

```txt
prisma/schema.prisma
```

Tables:

- `users`
- `user_settings`
- `transactions`

## Backend Structure

```txt
server/
├── index.ts
├── db.ts
├── middleware/
│   └── auth.ts
├── routes/
│   ├── auth.ts
│   ├── settings.ts
│   └── transactions.ts
└── utils/
    ├── json.ts
    ├── orderId.ts
    ├── pakasir.ts
    └── token.ts
```

Backend API routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions`
- `GET /api/transactions/:orderId`
- `POST /api/transactions/:orderId/check`
- `POST /api/transactions/:orderId/cancel`
- `POST /api/transactions/:orderId/simulate`
- `GET /api/public/transactions/:orderId`
- `POST /api/public/transactions/:orderId/check`
- `GET /api/realtime?token=JWT`
- `GET /api/tts/payment-received?amount={amount}`

## Frontend Structure

```txt
src/
├── main.tsx
├── App.tsx
├── lib/
│   ├── api.ts
│   ├── format.ts
│   ├── pakasir.ts       # legacy direct client, avoid for new flow
│   ├── status.ts
│   ├── storage.ts       # shared types/defaults + legacy helpers
│   └── tts.ts
├── store/
│   ├── AppContext.tsx
│   └── AuthContext.tsx
├── components/
└── pages/
```

Auth pages:

- `/login`
- `/register`

Protected pages:

- `/`
- `/transaksi/baru`
- `/transaksi/:orderId`
- `/laporan`
- `/pengaturan`

Public pages:

- `/login`
- `/register`
- `/p/:orderId` public customer QRIS payment page

## Data Flow

Create payment flow:

```txt
/transaksi/baru
  → api.createTransaction()
  → POST /api/transactions
  → backend reads user_settings
  → backend calls Pakasir transactioncreate/qris
  → backend stores transaction in MySQL
  → frontend navigates to /transaksi/:orderId
```

Payment status flow:

```txt
/transaksi/:orderId
  → polls POST /api/transactions/:orderId/check
  → backend calls Pakasir transactiondetail
  → backend updates MySQL
  → frontend shows success modal when completed
```

Public payment flow:

```txt
/p/:orderId
  → GET /api/public/transactions/:orderId
  → displays QR code, amount, countdown, status
  → polls POST /api/public/transactions/:orderId/check while pending
  → no cancel/simulate/copy QRIS string actions
```

Settings flow:

```txt
/pengaturan
  → GET /api/settings
  → PUT /api/settings
```

API key masking:

- Backend returns masked API key (`••••••••1234`) from settings.
- If frontend sends masked value back, backend keeps old full API key.
- If frontend sends new plain value, backend updates DB.

## QRIS Logo

QRIS logo is stored locally:

```txt
public/qris-logo.svg
```

Do not depend on the external Wikimedia URL in components.

## Design Notes

Current UI direction:

- Simple QRIS-inspired theme
- Red QRIS accent: `#D71920`
- Minimal white/glass cards
- Font: `Nunito` for body, `Baloo 2` for headings
- `/transaksi/*` pages hide bottom navbar for full-screen payment flow
- `/transaksi/:orderId` shows QRIS logo above QR, nominal below QR, simple black text

## Text-To-Speech

TTS uses Web Speech API in `src/lib/tts.ts`.

If Web Speech API is unavailable, frontend falls back to backend Edge TTS:

- `GET /api/tts/payment-received?amount={amount}`
- Backend uses `py -m edge_tts`
- Generated MP3 files are cached under `storage/tts/`
- `storage/` is gitignored

Behavior:

- Announces payment completion: `Pembayaran {amount} rupiah, diterima`
- Voice choices are filtered to Bahasa Indonesia (`id-*`) in Settings
- App tries `lang="id-ID"` if no Indonesian voice is available

## Known Caveats

- `src/lib/pakasir.ts` is legacy direct browser Pakasir client. New implementation should go through backend API. Avoid using it for new code.
- `src/lib/storage.ts` still exists for shared `StoredTransaction` / `AppConfig` types and old helpers. New persisted data should go through MySQL/API.
- Dashboard currently fetches latest 20 transactions from backend context. If adding more advanced summary, prefer a dedicated backend summary endpoint or use existing transaction list response summary.
- `JWT_SECRET` in `.env` must be changed before production use.
- JWT is stored in frontend localStorage for MVP. For production, consider httpOnly cookie auth.

## Verification Checklist

After changes, run:

```bash
npm run build
```

If backend/schema changed, run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:server
```

Manual test flow:

1. Register user.
2. Login.
3. Open Settings and save Pakasir slug/API key.
4. Create payment at `/transaksi/baru`.
5. Open payment detail.
6. Check/simulate payment if sandbox.
7. Confirm transaction appears in `/laporan`.
8. Confirm Dashboard latest transactions update.

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

# Web Push (VAPID). Generate with: node -e "console.log(require('web-push').generateVAPIDKeys())"
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@pasound.app"

# Reconciliation loop (optional; defaults shown). Set RECONCILE_ENABLED=false on
# all but one instance when running multiple instances.
# RECONCILE_ENABLED=true
# RECONCILE_INTERVAL_MS=60000
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

## Growth Features (added later)

These were added after the initial docs above; some earlier notes (e.g. merchant
self-serving Pakasir keys) are superseded by the admin-managed verification flow.

### Pakasir Webhook

- Endpoint: `POST /api/pakasir/webhook` (public, unauthenticated).
- Configure the Webhook URL per-project in the Pakasir dashboard to point at
  `https://<api-domain>/api/pakasir/webhook`. One URL serves all merchants; the
  body carries `project` + `order_id`.
- Pakasir webhooks are unsigned, so the body is treated only as a trigger: we
  look up the order, sanity-check `amount`/`project`, then re-verify the real
  status via `transactiondetail` using the merchant's credentials before
  applying changes. Unknown/already-final orders are acked with 200.
- For local dev, expose the endpoint with a tunnel (e.g. ngrok) and set that URL
  in Pakasir.
- Status reconciliation logic is shared in `server/utils/transactionSync.ts`
  (`syncTransactionStatus`), used by the check routes, the reconciler, and the
  webhook.

### Web Push Notifications (PWA)

- App is installable via `vite-plugin-pwa` (injectManifest); custom service
  worker at `src/sw.ts` handles `push` and `notificationclick`.
- Requires VAPID keys in `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`). Generate with
  `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
- Endpoints: `GET /api/push/public-key`, `POST /api/push/subscribe`,
  `POST /api/push/unsubscribe`. Table: `push_subscriptions`.
- A "payment received" push is sent from `syncTransactionStatus` when a tx
  completes (works even with the app closed). Opt-in toggle is in Settings.
- Note: the service worker is disabled in `vite` dev (`devOptions.enabled:false`).
  Test push using `npm run build` + `npm run preview` over HTTPS.

### Digital Receipt

- `src/components/Receipt.tsx` renders a completed transaction to a canvas PNG
  for download/share (Web Share API with WhatsApp + download fallback). Reachable
  from the QR payment success modal and completed-transaction actions.

### Quick Amount Presets

- Merchants store up to 8 preset nominals (`user_settings.quick_amounts`,
  comma-separated). Edited in Settings, surfaced as one-tap buttons on
  `/transaksi/baru` (falls back to defaults when empty).
- Pakasir requires a unique `amount` + `order_id` per transaction, so this is
  preset-driven, NOT a reusable open-amount static QR.

### Income Analytics

- `GET /api/dashboard/analytics?range=7d|30d` returns daily income time-series +
  busy-hour breakdown for completed transactions, bucketed by WIB and bounded by
  plan report retention. Rendered on the dashboard with hand-rolled SVG/flex
  charts (no chart library).

### New tables since initial docs

`plans`, `plan_orders`, `promo_codes`, `platform_settings`, `withdrawal_requests`,
`password_reset_tokens`, `push_subscriptions` (plus many added columns on
`users` and `user_settings`). See `prisma/schema.prisma` for the source of truth.


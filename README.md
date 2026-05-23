# Pasound

Pasound adalah web app mobile-first untuk membuat pembayaran QRIS lewat Pakasir, memvalidasi status pembayaran, dan menyimpan laporan transaksi ke MySQL.

## Fitur

- Login/register dengan JWT
- Generate pembayaran QRIS lewat Pakasir API
- Halaman QR fullscreen untuk proses pembayaran
- Validasi status pembayaran lewat backend
- Realtime sync multi-device via Server-Sent Events (SSE)
- Text-to-speech otomatis saat pembayaran diterima
- Dashboard ringkasan pemasukan dan transaksi terbaru
- Laporan transaksi dengan search, filter, export CSV, dan pagination
- Pengaturan Pakasir dan suara per user

## Stack

- Frontend: Vite, React 18, TypeScript
- Styling: Tailwind CSS
- Icons: Lucide CDN
- QR rendering: `qrcode`
- Backend: Express + TypeScript
- Database: MySQL + Prisma
- Auth: JWT + bcrypt
- Realtime: Server-Sent Events (SSE)
- Payment provider: Pakasir

## Requirement

- Node.js 20+
- MySQL berjalan di localhost
- Database bernama `pasound`
- User MySQL: `root`
- Password MySQL: kosong

## Environment

Buat atau sesuaikan file `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/pasound"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=3001
FRONTEND_ORIGIN="http://localhost:3000"
VITE_API_BASE_URL="/api"
```

Ganti `JWT_SECRET` sebelum dipakai production.

## Instalasi

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Jalankan migration:

```bash
npm run prisma:migrate
```

Jika migration sudah ada dan ingin deploy migration yang tersedia:

```bash
npx prisma migrate deploy
```

## Menjalankan Aplikasi

Terminal 1, backend:

```bash
npm run dev:server
```

Backend berjalan di:

```txt
http://localhost:3001
```

Terminal 2, frontend:

```bash
npm run dev
```

Frontend berjalan di:

```txt
http://localhost:3000
```

## Flow Pemakaian

1. Buka `http://localhost:3000`
2. Register akun baru
3. Buka Pengaturan
4. Isi Pakasir Project Slug dan API Key
5. Buat pembayaran di `/transaksi/baru`
6. QRIS dibuat oleh backend lewat Pakasir API
7. Halaman detail pembayaran polling status ke backend
8. Saat pembayaran berhasil, transaksi tersimpan dan laporan update realtime

## Script

```bash
npm run dev              # frontend Vite di port 3000
npm run dev:server       # backend Express di port 3001
npm run build            # build frontend
npm run preview          # preview frontend build
npm run prisma:generate  # generate Prisma client
npm run prisma:migrate   # jalankan Prisma migration dev
npm run prisma:studio    # buka Prisma Studio
```

## Struktur Project

```txt
server/
├── index.ts
├── db.ts
├── realtime.ts
├── middleware/
│   └── auth.ts
├── routes/
│   ├── auth.ts
│   ├── dashboard.ts
│   ├── realtime.ts
│   ├── settings.ts
│   └── transactions.ts
└── utils/
    ├── json.ts
    ├── orderId.ts
    ├── pakasir.ts
    └── token.ts

src/
├── App.tsx
├── main.tsx
├── components/
├── hooks/
├── lib/
├── pages/
└── store/

prisma/
├── schema.prisma
└── migrations/
```

## API Backend

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Settings:

- `GET /api/settings`
- `PUT /api/settings`

Dashboard:

- `GET /api/dashboard`

Transactions:

- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions`
- `GET /api/transactions/:orderId`
- `POST /api/transactions/:orderId/check`
- `POST /api/transactions/:orderId/cancel`
- `POST /api/transactions/:orderId/simulate`

Realtime:

- `GET /api/realtime?token=JWT`

## Realtime Sync

Realtime memakai Server-Sent Events (SSE).

Event yang dikirim backend:

- `transaction:created`
- `transaction:updated`
- `transactions:cleared`
- `settings:updated`

Ketika event diterima, frontend refresh dashboard/laporan/settings sesuai kebutuhan.

Catatan: SSE saat ini memory-based. Kalau backend di-scale ke beberapa instance, tambahkan Redis Pub/Sub agar event antar instance tetap sinkron.

## Database

Tabel utama:

- `users`
- `user_settings`
- `transactions`

Optimasi index transaksi:

- unique per user/order: `(user_id, order_id)`
- lookup order: `(user_id, order_id)`
- status/date: `(user_id, status, created_at)`
- date: `(user_id, created_at)`
- amount search: `(user_id, amount)`
- total payment search: `(user_id, total_payment)`

## Pakasir

Pakasir API dipanggil dari backend, bukan browser.

Keuntungan:

- API key tidak terekspos di frontend
- CORS Pakasir tidak jadi masalah
- transaksi selalu tersimpan di MySQL

## QRIS Logo

Logo QRIS disimpan lokal:

```txt
public/qris-logo.svg
```

Jangan pakai URL Wikimedia langsung di component.

## Catatan Keamanan

- JWT masih disimpan di localStorage untuk MVP
- Untuk production, pertimbangkan httpOnly cookie
- Pakasir API key saat ini tersimpan di DB, sebaiknya dienkripsi sebelum production
- Tambahkan rate limiting untuk login/register dan endpoint transaksi jika dipublish publik

## Build

```bash
npm run build
```

Output build berada di `dist/`.

## Manual Test Checklist

1. Register user baru
2. Login
3. Simpan settings Pakasir
4. Buat pembayaran QRIS
5. Buka detail pembayaran
6. Simulasi/check pembayaran jika sandbox
7. Pastikan TTS berbunyi saat status completed
8. Pastikan transaksi muncul di Laporan
9. Login akun sama di device/browser lain
10. Pastikan dashboard/laporan sync realtime

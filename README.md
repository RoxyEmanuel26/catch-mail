# RoxyMail — Personal Disposable Email Service

📬 Layanan email disposable pribadi dengan domain **roxystore.my.id**

![Architecture](https://img.shields.io/badge/Architecture-Serverless-emerald)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-000)
![Email](https://img.shields.io/badge/Email-Cloudflare%20Workers-F38020)

## Arsitektur

```
Browser → Vercel (Next.js 14) → Railway (FastAPI) → MongoDB Atlas
                                                   → Upstash Redis
Cloudflare Email Worker → Railway (Webhook) → MongoDB Atlas
```

## Fitur

- ✅ Catch-all email: terima email di username_apapun@roxystore.my.id
- ✅ Auto-detect OTP dari email (6-digit, 4-digit, spaced)
- ✅ PIN 6-digit untuk login (bcrypt hashed)
- ✅ Auto-refresh inbox setiap 5 detik
- ✅ Notifikasi pesan baru
- ✅ Dark mode premium UI
- ✅ 100% gratis, tanpa VPS

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Email Receiver | Cloudflare Email Worker |
| Backend | Python 3.12 + FastAPI + Motor |
| Database | MongoDB Atlas Free |
| Cache/Session | Upstash Redis Free |
| Frontend | Next.js 14 + TailwindCSS |
| Auth | JWT + bcrypt PIN |
| Hosting | Vercel + Railway (gratis) |

## Setup

### 1. MongoDB Atlas (GRATIS)

1. Buka [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create Free Account
2. Create Cluster → Free (M0) → Region: Singapore
3. Database Access → Add User (username + password)
4. Network Access → Allow from anywhere (`0.0.0.0/0`)
5. Connect → Drivers → Copy connection string
6. Replace `<password>` di connection string

### 2. Upstash Redis (GRATIS)

1. Buka [upstash.com](https://upstash.com) → Create Account
2. Create Database → Region: Singapore → Free tier
3. Copy REST URL dan REST Token

### 3. Railway Backend (GRATIS)

1. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Connect repo → select `/backend` folder
3. Tambahkan environment variables:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/roxymail
MONGODB_DB_NAME=roxymail
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
JWT_SECRET_KEY=<min 32 random characters>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MIN=15
REFRESH_TOKEN_EXPIRE_DAYS=7
WEBHOOK_SECRET=<random 32 char secret>
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=https://roxymail.vercel.app,http://localhost:3000
DOMAIN=roxystore.my.id
MAX_MESSAGES_PER_INBOX=200
MESSAGE_TTL_HOURS=24
```

4. Dapatkan URL deployment (contoh: `roxymail-api.up.railway.app`)

### 4. Vercel Frontend (GRATIS)

1. Buka [vercel.com](https://vercel.com) → Import Git Repository
2. Select `/frontend` folder sebagai root
3. Tambahkan environment variables:

```env
NEXT_PUBLIC_APP_NAME=RoxyMail
NEXT_PUBLIC_DOMAIN=roxystore.my.id
NEXT_PUBLIC_BACKEND_URL=https://roxymail-api.up.railway.app
```

4. Deploy → dapatkan URL (contoh: `roxymail.vercel.app`)

### 5. Cloudflare Email Worker (GRATIS)

1. Tambahkan domain `roxystore.my.id` ke Cloudflare (ubah nameserver di registrar)
2. Cloudflare Dashboard → Email → Email Routing → Enable
3. Workers & Pages → Create Worker → paste isi `cloudflare-worker/email-worker.js`
4. Tambahkan environment variables:

```
BACKEND_WEBHOOK_URL=https://roxymail-api.up.railway.app/api/webhook/inbound
WEBHOOK_SECRET=<sama dengan backend WEBHOOK_SECRET>
FALLBACK_EMAIL=your-personal@gmail.com
```

5. Email Routing → Routing Rules → Catch-all → Send to Worker → pilih worker kamu
6. DNS Records otomatis ditambahkan Cloudflare (MX records)

### 6. Test Full Flow

1. Buka `https://roxymail.vercel.app`
2. Buat email baru: `roxy_test@roxystore.my.id` dengan PIN `123456`
3. Login dengan email + PIN tersebut
4. Dari email lain, kirim email ke `roxy_test@roxystore.my.id`
5. Tunggu maks 10 detik → email muncul di inbox ✅
6. Test OTP: kirim email dengan teks "Kode OTP Anda: 847291"
   → `otp_detected = "847291"` muncul sebagai badge ✅

## Development Lokal

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # edit sesuai kebutuhan
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka: http://localhost:3000

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Daftar email baru |
| POST | `/api/auth/login` | Login dengan email + PIN |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/inbox` | List pesan (paginated) |
| GET | `/api/inbox/stats` | Statistik inbox |
| GET | `/api/inbox/:id` | Detail pesan |
| DELETE | `/api/inbox/:id` | Hapus pesan |
| DELETE | `/api/inbox` | Hapus semua pesan |
| POST | `/api/webhook/inbound` | Terima email dari CF Worker |

## Keamanan

- 🔒 PIN di-hash dengan bcrypt (12 rounds)
- 🔒 JWT dengan blacklisting via Redis
- 🔒 Brute force protection (5x gagal → lock 15 menit)
- 🔒 IDOR protection di semua endpoint inbox
- 🔒 HTML email di-sanitize dengan bleach
- 🔒 CORS terbatas ke domain tertentu
- 🔒 Webhook dilindungi dengan secret key

---

Built with ❤️ by Roxy

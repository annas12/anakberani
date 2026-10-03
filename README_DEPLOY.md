# AnakBerani + Cloudflare Worker + D1

Arsitektur starter ini memakai satu Cloudflare Worker untuk:
- menyajikan website statis dari folder `public/`
- API di `/api/*`
- database Cloudflare D1 melalui binding `DB`

## 1. Instal Node.js
Pastikan Node.js 20+ tersedia:

```bash
node -v
npm -v
```

## 2. Instal dependency

```bash
npm install
```

## 3. Login Cloudflare

```bash
npx wrangler login
```

## 4. Buat database D1

```bash
npx wrangler d1 create anakberani-db --location apac
```

Cloudflare akan menampilkan `database_id`. Salin ID tersebut ke `wrangler.jsonc`, menggantikan:

```text
GANTI_DENGAN_DATABASE_ID_D1
```

## 5. Buat tabel di D1 production

```bash
npm run db:remote
```

Untuk database lokal saat development:

```bash
npm run db:local
```

## 6. Jalankan lokal

```bash
npm run dev
```

Buka URL yang ditampilkan Wrangler, biasanya `http://localhost:8787`.
Tes API:

```text
http://localhost:8787/api/health
```

Harus mengembalikan JSON seperti `{ "ok": true, "service": "AnakBerani API" }`.

## 7. Deploy

```bash
npm run deploy
```

Worker akan mendapatkan URL `*.workers.dev`.

## 8. GitHub
Upload seluruh isi folder ini ke repository GitHub. Jangan upload `node_modules`.

## 9. Auto-deploy dari GitHub
Di Cloudflare Dashboard buka **Workers & Pages**, buat Worker dari Git repository / Workers Builds, pilih repository AnakBerani, lalu gunakan konfigurasi Wrangler di repository sebagai sumber konfigurasi deploy.

## API starter
- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET|POST /api/children`
- `GET|POST /api/checkins`
- `GET|POST /api/incidents`
- `GET|PUT /api/progress?child_id=...`
- `GET /api/lessons/completed?child_id=...`
- `POST /api/lessons/complete`

### Penting
Frontend v4 saat ini masih memakai `localStorage`. Backend sudah disiapkan, tetapi langkah berikutnya adalah mengganti penyimpanan frontend menjadi API setelah login. Jangan menyimpan nama sekolah lengkap, alamat, atau data sensitif lain yang tidak dibutuhkan.

## Program 30 Hari AnakBerani
Versi ini memakai program interaktif 30 hari. Setiap hari memuat materi inti, satu skenario keputusan, beberapa misi praktik, refleksi anak, panduan orang tua, serta syarat kelulusan harian. Progress tersimpan lokal sampai integrasi akun/D1 diaktifkan penuh.

Brand resmi aplikasi: **AnakBerani**  
Slogan: **Berani Aman, Lawan Bully**

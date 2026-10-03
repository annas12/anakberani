# Deployment AnakBerani

**Berani Aman, Lawan Bully** · Worker `anakberani-app` · D1 `anakberani-db`.

Status 3 Oktober 2026: belum live. Kredensial Cloudflare kedaluwarsa; `database_id` belum dapat ditetapkan. Jangan menganggap dry-run sebagai deployment.

## Deploy pertama atau deploy ulang

```sh
npm ci
npx wrangler login
npx wrangler whoami
npm test
npm run release
```

Jika menggunakan API token, sediakan `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` melalui environment/secret manager. Jangan menaruh token dalam source atau commit. Untuk beberapa akun, tentukan `CLOUDFLARE_ACCOUNT_ID` yang benar.

`release` membangun katalog, memeriksa login dan bundle, mencari D1 dengan nama `anakberani-db`, menggunakan database yang sudah ada atau membuatnya hanya jika tidak ditemukan, memperbarui `database_id`, menjalankan migrasi remote, membuat tipe, mendeploy Worker, dan memeriksa `/api/health`. Perintah berhenti ketika ada kegagalan. Tidak memerlukan `wrangler dev` atau localhost.

Setelah persiapan pertama, commit perubahan `wrangler.jsonc` dan tipe yang dihasilkan. ID D1 bukan secret. Jangan mengganti database dengan yang kosong jika database lama sudah berisi data. Migrasi awal menggunakan CREATE IF NOT EXISTS agar schema starter tetap kompatibel; migrasi kedua menambah kolom/tabel dan memindahkan check-in berprofil tanpa menghapus tabel lama.

Deploy rutin juga dapat memakai:

```sh
npm run build
npm run db:remote
npm run deploy
```

`npm run deploy` mengasumsikan `database_id` sudah benar dan migrasi sudah diterapkan. URL berasal dari output Wrangler, berbentuk `https://anakberani-app.<subdomain-akun>.workers.dev`; subdomain belum diketahui sampai akses akun tersedia.

## Pemeriksaan live sesudah deploy

1. Buka URL Worker dan `/api/health`; pastikan HTTP 200 dan `ok: true`.
2. Jalankan `npx wrangler tail anakberani-app --format json` selama pengujian. Jangan log password, cookie atau isi catatan anak.
3. Daftar menggunakan akun pengujian milik Anda, buat dua profil dengan nama fiktif, dan uji login/logout/refresh.
4. Simpan check-in dan catatan tanpa bukti; pastikan profil kedua tidak melihat data profil pertama.
5. Lengkapi program hari pertama. Tombol harus nonaktif sebelum jawaban benar, seluruh misi, dan refleksi lengkap. Refresh, pilih kembali profil, dan periksa bahwa data bertahan.
6. Selesaikan simulator dari jalur tenang dan jalur eskalasi, lalu periksa enam skor/progress.
7. Buka browser console, periksa mobile dan desktop. Perbaiki setiap error sebelum mengumumkan URL live.

Pengujian ini belum dijalankan di produksi karena akses Cloudflare belum tersedia. Tes runtime/D1 lokal dan alur browser sudah dijalankan; lihat README dan laporan hasil.

## Melihat D1

Cloudflare Dashboard → pilih akun yang digunakan Wrangler → **Storage & databases → D1 → anakberani-db** → buka Console untuk SQL atau tabel data. `users`, `children` dan semua aktivitas berisi data privat: jangan membagikan hasil query yang mengandung data anak.

Pemeriksaan schema melalui CLI:

```sh
npx wrangler d1 execute anakberani-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

## Custom domain

Setelah domain ditambahkan sebagai zone aktif pada akun Cloudflare yang sama, buka **Workers & Pages → anakberani-app → Settings → Domains & Routes → Add → Custom Domain**. Pilih domain/subdomain milik Anda. Cloudflare mengelola DNS dan sertifikat yang diperlukan untuk custom domain Worker.

Untuk mengelola lewat konfigurasi, tambahkan setelah nama domain diketahui:

```json
"routes": [{ "pattern": "app.domain-anda.id", "custom_domain": true }]
```

Lalu deploy ulang. Pertahankan `workers_dev: true` jika URL workers.dev tetap diinginkan. Semua API memakai URL relatif `/api`, jadi frontend dan backend tetap satu origin. Login ulang pada domain baru karena cookie bersifat per-host.

Referensi resmi: [Wrangler](https://developers.cloudflare.com/workers/wrangler/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

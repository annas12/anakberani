# AnakBerani

**Berani Aman, Lawan Bully**

Pendamping latihan anak dan orang tua. Satu akun orang tua memiliki beberapa profil anak, dengan data privat per akun dan progress terpisah. Frontend statis dan API `/api/*` berjalan pada satu Cloudflare Worker.

## Status

**Live:** https://anakberani-app.annasmashuri97.workers.dev — dideploy 3 Oktober 2026. Health check, register/login/logout, ownership, insert/read D1, program dan simulator telah diuji pada URL live dengan data sintetis. Repository: https://github.com/annas12/anakberani.

## Fitur

- Registrasi/login email dan password, session cookie Secure + HttpOnly + SameSite=Lax, masa berlaku 30 hari, logout dan pembatasan percobaan login.
- Password PBKDF2-SHA256 dengan salt acak. Hash lama dari starter diupgrade setelah login berhasil. Token sesi disimpan sebagai hash SHA-256.
- Multi-profil anak, mode anak/orang tua, delapan materi akademi.
- Program 30 hari: materi, tujuan, skenario, checklist praktik, pendampingan orang tua, refleksi, draf, XP dan skill. Server menolak penyelesaian jika syarat belum lengkap.
- Sepuluh jenis simulasi bercabang dengan enam skor; respons sebelumnya menentukan perkembangan cerita. XP hanya sekali per jenis simulasi.
- Check-in dengan pertanyaan lanjutan, riwayat, catatan kejadian tanpa bukti, waktu/lokasi/pihak/saksi/pengulangan, timeline dan ringkasan pola berdasarkan jenis.
- Latihan bersama orang tua tersimpan, progress enam skill, XP, level dan streak hari kalender Asia/Jakarta.
- Tampilan desktop/mobile, manifest dan ikon untuk add-to-home-screen. Data pribadi tidak disimpan dalam localStorage dan tidak dicache untuk offline.
- Pemeriksaan ownership di seluruh endpoint data anak, SQL parameterized, proteksi Origin/CSRF, batas ukuran request, escaping teks pengguna, header keamanan dan Worker observability.

Semua fitur aktivitas di atas terhubung ke API/D1 dalam kode dan sudah diuji pada D1 lokal. Draf refleksi baru tersimpan setelah **Simpan draf latihan** atau **Tandai Hari Selesai**. Sebelum itu draf berada dalam memori tab. Data localStorage dari versi lama tidak diimpor otomatis karena tidak mempunyai identitas pemilik/profil yang bisa diverifikasi.

Belum tersedia: unggahan file foto/video (yang ada hanya pencatatan jenis bukti), reset password/email verification, notifikasi otomatis, sinkronisasi offline, dan penilaian klinis. Skor merupakan catatan latihan, bukan diagnosis atau ukuran jaminan keselamatan. Mode anak dan orang tua adalah tampilan dalam akun keluarga yang sama, bukan batas izin terpisah atau PIN orang tua.

## Struktur

```text
public/                  frontend, materi, program, simulator, manifest
src/index.js             API Worker
src/content.js           katalog bersama hasil build
migrations/              migrasi D1 berurutan
scripts/build-content.mjs sinkronisasi katalog frontend dan validasi server
scripts/release.mjs       cari/buat D1, migrasi remote, deploy, health check
tests/api.test.mjs        integrasi runtime Worker dan D1
wrangler.jsonc           Worker anakberani-app + binding DB/ASSETS
```

Edit materi di `public/`, lalu `npm run build`. Jangan mengedit `src/content.js` secara terpisah.

## Database

| Tabel | Fungsi |
|---|---|
| users | Akun orang tua dan hash password |
| sessions | Hash token dan masa kedaluwarsa; FK ke users |
| children | Profil; FK pemilik ke users |
| daily_checkins | Kondisi harian dan catatan; FK akun/profil |
| incidents | Kronologi, waktu, lokasi, pihak, saksi, laporan, bukti opsional, pengulangan |
| training_progress | Ringkasan XP/streak/skill yang dihitung server |
| completed_lessons | Materi selesai, unik per profil/materi |
| program_progress | Jawaban/checklist/status per profil/hari |
| reflections | Refleksi per profil/hari |
| simulation_results | Jalur pilihan dan enam skor hasil simulasi |
| parent_child_exercises | Latihan bersama, unik per profil/latihan |
| auth_limits | Penghitung autentikasi sementara tanpa menyimpan IP/email mentah |
| checkins | Tabel legacy dipertahankan; data lama berprofil disalin ke daily_checkins |

Indeks mencakup pemilik profil, sesi/kedaluwarsa, serta kejadian/check-in/simulasi berdasarkan profil dan tanggal. Migrasi memakai foreign key dan tidak menghapus data starter. Gunakan migrasi, bukan menjalankan ulang `schema.sql` (schema starter lama).

## Pengujian

Node.js 22 atau lebih baru:

```sh
npm ci
npm test
npm run check
```

Tes menguji auth lama/baru, cookie, expiry/logout, CSRF, isolasi akun/profil, check-in, kejadian tanpa bukti, gate penyelesaian, XP idempotent, sepuluh simulasi, latihan orang tua dan persistensi. Struktur 30 hari serta semua cabang simulator juga diverifikasi. Workflow GitHub menjalankan tes dan dry-run build.

Untuk preview opsional: `npm run db:local` lalu `npm run dev`. **Localhost bukan prasyarat deployment.**

## Deploy dan domain

Lihat [README_DEPLOY.md](README_DEPLOY.md). Worker: **anakberani-app**. D1: **anakberani-db**, binding **DB**. URL live: https://anakberani-app.annasmashuri97.workers.dev.

# Admin Access Manager AnakBerani

Halaman admin:

`https://anakberani.drama.my.id/admin/access`

Fitur:
- tambah email akses manual
- masa akses 6 bulan, 1 tahun, lifetime, atau custom
- cari/filter akses
- cabut akses tanpa menghapus data anak
- aktifkan kembali akses
- ubah masa berlaku
- audit log perubahan admin

## 1. Tentukan email admin

Set `ADMIN_EMAILS` di Cloudflare Worker. Gunakan secret agar tidak perlu menaruh email admin di repository:

```sh
npx wrangler secret put ADMIN_EMAILS
```

Isi misalnya:

```text
admin1@example.com,admin2@example.com
```

Email harus sama dengan akun AnakBerani yang dipakai login.

## 2. Jalankan migration production

```sh
npm run db:remote
```

Migration `0003_access_admin.sql` membuat:
- `access_entitlements`
- `admin_access_logs`

Migration tidak menghapus data lama.

## 3. Deploy

```sh
npm run deploy
```

atau gunakan release flow existing jika memang ingin menjalankan pemeriksaan penuh:

```sh
npm run release
```

## 4. Gunakan

1. Login ke AnakBerani dengan email admin.
2. Buka `/admin/access`.
3. Masukkan email pembeli.
4. Pilih masa akses.
5. Klik **Tambah Akses**.

Akses yang dicabut tetap menyimpan record dan data latihan anak.

## Catatan

Admin Access Manager saat ini mengelola entitlement. Integrasi aktivasi akun berbayar/Scalev dapat menggunakan tabel yang sama pada tahap berikutnya. Existing user flow belum dipaksa menggunakan entitlement sampai activation/payment gating diaktifkan secara eksplisit.

# MLBB Shop

Backend tugas Modul 4 dengan **Express 5, TypeScript, Prisma 7, PostgreSQL Neon, dan @prisma/adapter-neon**, beserta frontend toko hero/skin. Versi 1.1 memperbaiki proses menjalankan proyek.

## Cara tercepat di Windows

1. **Ekstrak seluruh ZIP ke folder baru.** Jangan membuka JALANKAN.cmd dari dalam ZIP.
2. Pastikan **Node.js 24** terpasang.
3. Klik dua kali **JALANKAN.cmd**. Tunggu pemasangan dependency, pembuatan Prisma Client, dan seed selesai.
4. Buka alamat **Website** yang muncul di terminal. Biasanya http://localhost:3000.

Website dibuka melalui alamat server pada terminal. Folder public berisi source antarmuka yang disajikan oleh server tersebut.

Cara terminal dari folder yang berisi package.json cukup:

```powershell
npm.cmd start
```

Peluncur memasang dependency dari package-lock.json jika diperlukan, membuat Prisma Client, membuat database lokal, lalu menyalakan server. **Mode demo lokal berjalan tanpa .env, akun Neon, atau PostgreSQL terpisah.** Internet diperlukan saat pemasangan package pertama. Data tersimpan di folder .local-db dan dipertahankan setelah restart.

Jika port 3000 dipakai, server mencoba port berikutnya dan menampilkan alamat yang benar. Biarkan terminal terbuka selama website digunakan; tekan Ctrl+C untuk berhenti. Pesan proses disimpan di **logs/startup.log**.

**Untuk pemenuhan tugas yang meminta Neon, gunakan mode Neon di bawah.** Mode lokal membantu mencoba dan memperbaiki alur demo; mode lokal tidak menjadi bukti koneksi cloud. Footer website dan response /health menampilkan mode yang sedang dipakai.

Panduan rekaman: **[README-DEMO.md](README-DEMO.md)**. Screenshot: **screenshots/**. Laporan pemeriksaan: **docs/HASIL-PENGUJIAN.md**.

## Mode Neon untuk tugas

Klik **JALANKAN-NEON.cmd**, atau jalankan:

```powershell
npm.cmd run start:neon
```

Peluncur menjalankan setup, migrasi Prisma, dan seed awal jika database kosong, lalu menghubungkan server ke Neon. Data Neon yang sudah ada dipertahankan. Mode Neon tidak otomatis berpindah ke database lokal jika koneksi gagal.

### Mengisi koneksi satu kali

1. Buka Neon Console, pilih project, lalu **Connect**.
2. Pilih branch, database, dan role khusus tugas. Aktifkan **Connection pooling**.
3. Salin koneksi lengkap, lalu tempel ketika diminta. URL biasa atau perintah `psql 'postgresql://...'` diterima oleh setup.
4. Untuk URL pooling OFF, boleh tekan Enter agar setup membuat alamat direct dari koneksi pooling pada branch/database/role yang sama. Bisa juga menempel URL direct dari Neon Console.
5. Tunggu pesan **MLBB SHOP SIAP — NEON**, lalu buka alamat Website.

Setup menyimpan kedua URL ke .env. Alternatifnya, buat .env dari .env.example dan isi sendiri:

```dotenv
DATABASE_URL=
DATABASE_URL_UNPOOLED=
PORT=3000
```

DATABASE_URL dipakai aplikasi melalui PrismaNeon; DATABASE_URL_UNPOOLED dipakai migrasi. URL valid harus berasal dari akunmu. Jangan memasukkan .env ke GitHub atau menampilkannya saat merekam.

`npm run setup`, `check:env`, `db:migrate`, `db:deploy`, `db:seed`, dan `db:studio` khusus mode Neon. Koneksi kosong pada check:env bukan penghambat untuk mode lokal; jalankan npm start jika hanya ingin mencoba aplikasi lokal.

## Perintah berdasarkan mode

| Kebutuhan | Demo lokal | Neon |
| --- | --- | --- |
| Mulai dan persiapan otomatis | npm start / JALANKAN.cmd | npm run start:neon / JALANKAN-NEON.cmd |
| Persiapan tanpa menyalakan server | npm run setup:local | npm run setup |
| Pengembangan dengan reload | npm run dev | npm run dev:neon |
| Reset seed sebelum mengulang testcase | npm run demo:reset | npm run demo:reset:neon |
| Jalankan hasil build | npm run start:build | npm run start:build:neon |

Hentikan server sebelum reset. Reset lokal mengembalikan hanya database .local-db. Reset Neon menghapus dan mengisi ulang empat tabel MLBB pada koneksi Neon aktif. Gunakan database/branch khusus tugas.

Migrasi awal disertakan pada prisma/migrations/20261104000100_init. Untuk memperagakan pengembangan schema di Neon:

```powershell
npm run check:env
npm run db:migrate -- --name init
npm run db:generate
npm run db:studio
```

Prisma 7 menjalankan generate secara terpisah. Sesudah setup, migrate dev dapat melaporkan schema sudah sinkron karena migrasi awal telah diterapkan.

## Dataset dan seed

Dataset diambil dari **tautan resmi pada PDF tugas**. Arsip sumber berisi CSV, sehingga data dikonversi ke `data/heroes.json` dan `data/skins.json`. CSV aslinya tetap tersedia di `data/source/`. Nilai angka dikonversi menjadi number dan harga kosong menjadi null; urutan ID tetap mengikuti sumber.

- **133 hero**, Miya id 1 sampai Hirara id 133.
- **892 skin**, termasuk Silverbolt Raiko id 891 milik Selena.
- **20 Marksman**, **11 skin Layla**, dan **98 skin GRAND**.

Jalankan `npm run data:verify` untuk memeriksa jumlah dan ID penting.

Saat perintah reset/seed dijalankan, seed mengosongkan `PlayerHero`, `Player`, `Skin`, dan `Hero` menggunakan `TRUNCATE ... RESTART IDENTITY CASCADE`, kemudian menjalankan createMany untuk hero, skin, player, dan kepemilikan. Gunakan database/branch khusus tugas karena seed mengembalikan keempat tabel tersebut ke kondisi awal.

| ID | Nickname | BP | Diamond | Hero awal |
| --- | --- | ---: | ---: | --- |
| 1 | ArekITS | 1500 | 75 | Layla, Miya |
| 2 | SangPushRank | 13000 | 2892 | Ling, Gusion |
| 3 | MageSurabaya | 10000 | 0 | — |

Player baru mendapat default **10000 BP dan 0 Diamond** langsung dari schema.

## Demo 28 testcase di Postman VS Code

1. Hentikan server jika sedang berjalan.
2. Lokal: `npm run demo:reset`, lalu `npm start`. Untuk demo tugas Neon: `npm run demo:reset:neon`, lalu `npm run start:neon`.
3. Di VS Code, buka extension Postman dan masuk ke workspace Postman. Tekan **Ctrl+Shift+P → Postman: Import → File**, atau klik Import di bagian atas sidebar Postman.
4. Pilih **postman/MLBB-Shop-28-Testcase.postman_collection.json**.
5. Buka collection **MLBB Shop - 28 Testcase Teruji**. Kirim **01 sampai 28 berurutan**, satu kali untuk setiap request.

Collection asli yang kamu berikan disimpan sebagai `postman/mlbb-shop-testcase.original.json`. Collection teruji menambahkan assertion otomatis dan metadata ekspor. Method, path, query, dan body testcase tetap mengikuti aslinya. Semua ID dan URL literal; tidak perlu mengisi variabel Postman.

Pilih file JSON collection setelah ZIP diekstrak. Jangan memilih ZIP, file dataset heroes.json, atau file .env pada dialog impor collection. Referensi: [panduan impor resmi Postman VS Code](https://learning.postman.com/docs/reference/vs-code-extension/import-data/import-postman-data).

Jika port berubah (di .env atau karena port sebelumnya dipakai), jalankan server lalu unduh collection dari tautan **Collection Postman** pada footer toko, atau impor ulang file collection yang diperbarui saat startup.

| No. | Pengujian | Hasil utama |
| --- | --- | --- |
| 01–05 | Health, daftar/filter/search hero, detail Layla, ID tidak ada | 200; Marksman 20; search la 10; skin Layla 11; ID 999 menghasilkan 404 |
| 06–08 | Tambah Collie, nama duplikat, data kurang | 201 id 134; 409; 400 |
| 09–11 | Skin Layla, GRAND, detail skin 891 | 11 skin; 98 GRAND; Silverbolt Raiko/Selena |
| 12–13 | Player baru dan nickname duplikat | JunglerMalam id 4; 409 |
| 14–16 | Top up 706, amount negatif, WIN | Diamond 706; 400; BP 10300 |
| 17–21 | Beli Freya/Layla, pembelian ulang, saldo kurang | Freya BP 400; Freya Diamond 201/sisa 107; Layla BP 201/sisa 8300; ulang 409; kurang 400 |
| 22–24 | Detail player, ubah nickname, duplikat nickname | Freya dan Layla dimiliki; MageITS; 409 |
| 25 | Statistik | 4 player, 6 kepemilikan, 3074 Diamond, Layla dimiliki 2 player |
| 26–28 | Hapus player, detail terhapus, URL asing | 200; 404; 404 |

Screenshot PDF memuat beberapa percobaan yang diulang: misalnya top up terlihat 1412 dan match terlihat 10600. Seed dan collection satu putaran menghasilkan **706** dan **10300**, sesuai instruksi tertulis. Hasil statistik di atas dihitung dari urutan 01–28, sebelum player 4 dihapus.

Jika POST Collie atau JunglerMalam menghasilkan 409 saat seharusnya 201, data testcase sudah pernah dibuat. Jalankan reset sebelum mengulang keseluruhan urutan. Mengklik fitur web juga mengubah data; sebaiknya jalankan testcase dulu, lalu demo web atau reset kembali.

## Demo melalui website

- **Hero:** cari nama, pilih role, pindah halaman, lalu klik hero untuk melihat detail, skin, dan pilihan mata uang.
- **Beli hero:** pilih MageSurabaya pada dropdown player. Beli Layla memakai BP, atau top up Diamond lalu beli Freya. Hero yang sudah dimiliki mendapat tanda Dimiliki, dan saldo berubah sesuai transaksi.
- **Top up:** klik tombol plus di samping saldo Diamond, isi bilangan bulat positif, lalu konfirmasi.
- **Koleksi:** tampilkan hero yang dimiliki beserta mata uang dan harga saat dibeli. Tombol Hadiah match menambah 300 BP untuk WIN atau 100 BP untuk LOSE.
- **Skin:** filter berdasarkan hero dan rarity, lalu buka detail. Fitur skin adalah galeri.
- **Player:** buat player, ganti nickname, pindah player aktif, dan hapus player melalui dialog konfirmasi.
- **Statistik:** lihat jumlah player, total kepemilikan dan Diamond, hero terpopuler, serta jumlah hero per role.

Tidak ada login atau JWT pada aplikasi ini, sesuai ketentuan. Dropdown player digunakan untuk memilih data yang sedang didemokan.

## Endpoint

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | /health | Pemeriksaan server dan koneksi database |
| GET | /api/heroes | page, limit, search, role |
| GET | /api/heroes/:hero_id | Hero dengan semua skin |
| POST | /api/heroes | name, role, lane, releaseYear, priceBP, priceDiamond |
| GET | /api/skins | page, limit, heroId, rarity; menyertakan nama hero |
| GET | /api/skins/:skin_id | Skin beserta hero |
| POST | /api/players | nickname; saldo memakai default schema |
| GET | /api/players/:player_id | Player dan hero yang dimiliki |
| PATCH | /api/players/:player_id | Mengubah nickname |
| DELETE | /api/players/:player_id | Menghapus player beserta PlayerHero |
| POST | /api/players/:player_id/topup | amount, increment Diamond |
| POST | /api/players/:player_id/matches | result WIN/LOSE, increment BP |
| POST | /api/players/:player_id/heroes | heroId, currency BP/DIAMOND |
| GET | /api/statistics | count, aggregate, dan groupBy |
| GET | /api/players | Tambahan untuk daftar/pemilih player pada frontend |

Default pagination page=1 dan limit=10. Limit maksimal 100. Response sukses memakai `{ status: true, message, data }`; endpoint pagination menambahkan metadata berisi currentPage, limit, totalItems, totalPages. Response gagal memakai `{ status: false, message }`.

### Transaksi pembelian

Urutannya: validasi input → cari player → cari hero → periksa harga untuk mata uang → periksa kepemilikan → periksa saldo. Setelah valid, `$transaction([ ... ])` menjalankan decrement saldo dan create PlayerHero.

Update saldo juga menyertakan kondisi saldo minimal di database. Unique constraint playerId+heroId melindungi pembelian ulang. Jika salah satu query gagal, debit ikut dibatalkan. Pengujian mencakup dua request pembelian bersamaan agar saldo tidak terpotong dua kali atau menjadi negatif.

## Struktur

| Lokasi | Tanggung jawab |
| --- | --- |
| src/index.ts | Koneksi Neon dan app.listen |
| src/app.ts | Parser JSON, logger, router, frontend, notFound, errorHandler |
| src/routes/ | Pemetaan method dan endpoint |
| src/controllers/ | Penanganan HTTP dan response |
| src/services/player.service.ts | Increment saldo dan transaksi pembelian |
| src/lib/ | PrismaNeon, validasi, dan collection |
| prisma/ | Schema, migrasi awal, dan seed |
| data/ | Dataset JSON dan CSV sumber |
| public/ | HTML, CSS, JavaScript, artwork, dan font |
| tests/ | API dan validasi konfigurasi |

## Pengujian

```powershell
npm test
npm run test:env
npm run typecheck
npm run build
```

Tes API memakai PostgreSQL WASM dan proxy WebSocket lokal yang terisolasi, dengan PrismaNeon yang sama. Tes tambahan menjalankan entry lokal sebagai proses terpisah, memeriksa data setelah restart, reset, penguncian database, serta perpindahan port. Tes tidak mengakses Neon milikmu. Pengujian cloud Neon memerlukan connection string akunmu.

`npm run build` menghasilkan dist. `npm run start:build` menjalankan hasil kompilasi lokal; `npm run start:build:neon` menjalankan hasil kompilasi Neon. Hasil pengujian dan bukti demo tersedia pada docs/ dan screenshots/.

## Pengumpulan GitHub

Isi identitas dan pembagian tugas di `KELOMPOK.md`. Buat repository **public** dengan nama **pweb-express-[nomor kelompok]-2026** sesuai nomor kelompokmu. Upload isi proyek ini; jangan upload node_modules, dist, .local-db, logs, atau .env. `.gitignore` sudah disediakan.

Contoh setelah membuat repository kosong di akun GitHub:

```powershell
git init
git add .
git commit -m "Implement MLBB Shop Modul 4"
git branch -M main
git remote add origin URL_REPOSITORY_KELOMPOKMU
git push -u origin main
```

Ganti URL_REPOSITORY_KELOMPOKMU dengan URL repo yang benar. Kumpulkan link repository pada form dari asisten. Seluruh anggota perlu memahami bagian yang dikerjakan dan mengikuti demo.

## Jika ada kendala

| Kendala | Langkah |
| --- | --- |
| URL Neon kosong/placeholder | Untuk lokal cukup npm start. Untuk tugas Neon jalankan npm run start:neon, isi koneksi dari Connect |
| P1000/autentikasi gagal | Salin ulang URL dengan role dan password yang masih berlaku |
| P1001/timeout | Periksa internet dan endpoint Neon, kemudian ulangi setup |
| Client belum dibuat | Jalankan npm run db:generate atau npm run setup |
| Port 3000 dipakai | Peluncur mencoba port berikutnya. Pakai alamat yang dicetak dan unduh collection terbaru dari footer |
| Server lokal dari folder ini masih berjalan | Buka terminal server sebelumnya, gunakan alamatnya atau hentikan dengan Ctrl+C |
| Instalasi terputus / Cannot find module | Jalankan npm ci, lalu npm start. Log ada di logs/startup.log |
| Jendela langsung gagal sebelum memasang package | Pastikan seluruh ZIP diekstrak dan Node.js 24 terpasang |
| 400 saat membeli Freya memakai BP | Hasil sesuai aturan: harga BP Freya null |
| 409 saat membeli ulang | Player sudah memiliki hero tersebut |
| 404 sesudah DELETE | Hasil sesuai aturan: player sudah terhapus |
| Gambar skin tertentu belum tampil | Sebagian artwork skin dimuat dari arsip daring; data dan filter tetap berasal dari API |

Art MLBB milik MOONTON, dengan arsip gambar dari Sparkies01/Splash. Artwork 133 hero dan 31 skin dibundel untuk tampilan awal/detail Layla. Aset lain dimuat sesuai kebutuhan. Lihat docs/ASSETS.md untuk sumber dan lisensi font.

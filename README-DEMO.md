# Panduan rekaman demo MLBB Shop

Durasi yang disarankan 8–12 menit. Isi nama, NIM, nomor kelompok, dan kontribusi sebenarnya pada KELOMPOK.md sebelum pengumpulan.

## Persiapan sebelum merekam

Ekstrak proyek, buka terminal pada folder yang berisi package.json, lalu jalankan:

```powershell
npm run start:neon
```

Tempel koneksi Neon milikmu ketika setup meminta: pooling ON untuk DATABASE_URL. Untuk URL direct, tempel pooling OFF atau tekan Enter agar dibuat dari koneksi pooling tadi. Keduanya harus dari branch, database, dan role yang sama. Petunjuk lengkap ada di README.md. Jangan tampilkan password atau file .env dalam rekaman.

**Untuk latihan tanpa akun Neon**, jalankan `npm start` atau JALANKAN.cmd. Gunakan `npm run demo:reset` untuk mengulang seed lokal. Footer dan /health menandai mode lokal; gunakan mode Neon saat memperlihatkan pemenuhan syarat cloud.

Impor `postman/MLBB-Shop-28-Testcase.postman_collection.json` melalui extension Postman di VS Code: Ctrl+Shift+P → Postman: Import → File. Pastikan collection berisi 28 request. Tidak perlu mengisi variabel URL atau ID.

Sesaat sebelum mulai, kembalikan data demo dan nyalakan server:

```powershell
npm run demo:reset:neon
npm run start:neon
```

Reset menghapus data empat tabel MLBB dan mengisi seed kembali. Gunakan database khusus tugas. Biarkan terminal server terbuka. Selama langkah Postman, kirim setiap request tepat satu kali sesuai urutan; aktivitas website dapat mengubah saldo dan hasil statistik.

## 1. Pembukaan dan tujuan

Perkenalkan kelompok. Jelaskan: “Aplikasi ini adalah API toko hero Mobile Legends. Player dapat menambah Diamond, memperoleh BP dari match, membeli hero, dan melihat koleksinya. Backend memakai Express 5, TypeScript, Prisma 7, PostgreSQL Neon, dan adapter Neon. Tidak ada login atau JWT sesuai ketentuan tugas.”

Tunjukkan package.json dan struktur folder secara singkat. Frontend toko merupakan tambahan untuk memperlihatkan perubahan data melalui antarmuka.

## 2. Schema dan seed

Buka prisma/schema.prisma. Jelaskan empat tabel: Hero menyimpan katalog, Skin terhubung ke Hero, Player menyimpan saldo, PlayerHero menyimpan kepemilikan dan harga saat pembelian. Kombinasi playerId dan heroId harus unik agar satu player tidak membeli hero yang sama dua kali.

Tunjukkan enum Role, Lane, Rarity, dan Currency. Jelaskan default player baru adalah 10000 BP dan 0 Diamond. Harga null berarti mata uang tersebut tidak tersedia. Relasi cascade membersihkan Skin saat Hero dihapus dan PlayerHero saat Player dihapus.

Buka src/lib/seed-data.ts (dipanggil oleh prisma/seed-data.ts). Seed memakai TRUNCATE dengan RESTART IDENTITY CASCADE, lalu createMany. Dataset asli berisi 133 hero dan 892 skin; urutannya dipertahankan. Ada tiga player awal dan empat kepemilikan awal. Dataset sumber CSV juga disertakan di data/source.

## 3. Health, katalog, dan validasi — request 01–11

Kirim request 01–05. Tunjukkan health 200, filter Marksman total 20, pencarian “la” total 10, detail Layla dengan 11 skin, serta ID hero tidak tersedia menghasilkan 404. Jelaskan metadata pagination dan pencarian tanpa membedakan huruf besar/kecil.

Kirim 06–08. Collie dibuat dengan id 134; nama yang sama menghasilkan 409; body yang kurang menghasilkan 400. Ini memperlihatkan validasi input dan penanganan unique constraint.

Kirim 09–11. Skin Layla berjumlah 11; rarity GRAND berjumlah 98; skin 891 adalah Silverbolt Raiko milik Selena. Nama hero diperoleh melalui relasi, bukan ditulis manual pada response.

## 4. Player, top up, dan match — request 12–16

Kirim 12–13. JunglerMalam dibuat sebagai player id 4 dengan default saldo; nickname ArekITS yang sudah ada ditolak 409.

Kirim 14–16. MageSurabaya mendapat 706 Diamond; amount negatif ditolak 400. WIN menambah 300 BP sehingga saldo menjadi 10300. LOSE memberi 100 BP. Operasi increment dilakukan di database.

## 5. Pembelian dengan transaksi — request 17–21

Jelaskan pemeriksaan secara berurutan: body valid → player ada → hero ada → harga tersedia → belum dimiliki → saldo cukup. Kemudian kirim 17–21:

| Request | Hasil yang dijelaskan |
| --- | --- |
| 17 | Freya memakai BP ditolak 400 karena priceBP null |
| 18 | Freya memakai Diamond berhasil 201; biaya 599, sisa 107 |
| 19 | Layla memakai BP berhasil 201; biaya 2000, sisa 8300 |
| 20 | Membeli Layla lagi ditolak 409 karena sudah dimiliki |
| 21 | ArekITS membeli Hirara memakai BP ditolak 400 karena saldo kurang |

Buka src/services/player.service.ts, bagian buyHero. Tunjukkan `$transaction([ ... ])` yang berisi decrement saldo dan create PlayerHero. Keduanya harus berhasil bersama. Kegagalan create membatalkan debit. Kondisi saldo minimal pada update serta unique constraint juga melindungi request pembelian bersamaan.

## 6. Koleksi, perubahan nickname, dan statistik — request 22–25

Kirim 22. MageSurabaya memiliki Freya dan Layla, dengan currency serta pricePaid masing-masing. Kirim 23 untuk mengganti nickname menjadi MageITS. Request 24 ditolak 409 karena nickname ArekITS sudah dipakai.

Kirim 25. Pada tahap ini terdapat 4 player, 6 kepemilikan, total 3074 Diamond, dan Layla dimiliki 2 player. Tunjukkan count untuk jumlah data, aggregate _sum untuk total Diamond, dan groupBy untuk hero terpopuler serta distribusi role di src/controllers/statistics.controller.ts.

Angka ini mengikuti seed dan collection satu putaran. Beberapa contoh gambar pada PDF berasal dari request yang diulang, sehingga angkanya dapat berbeda.

## 7. Delete dan error handler — request 26–28

Kirim 26 untuk menghapus player 4, lalu 27 menghasilkan 404. Request 28 memakai alamat API yang tidak dikenal dan menghasilkan 404. Error tersebut adalah hasil pengujian yang diharapkan.

Tunjukkan middleware logger, HttpError, notFound, dan errorHandler. Semua response berhasil memiliki status, message, data; response gagal memiliki status false dan message. Log terminal memperlihatkan method, URL, HTTP status, dan durasi.

## 8. Demo tampilan website

Buka http://localhost:3000. Pilih MageITS, lalu tampilkan Koleksi dan saldo. Jelaskan bahwa data yang terlihat berasal dari API yang sama dengan Postman.

Tunjukkan pencarian hero, filter role, pagination, detail hero dan skin, serta filter hero/rarity di halaman Skin. Hero yang sudah dibeli memiliki label Dimiliki. Halaman Skin merupakan galeri; pembelian pada tugas ini adalah pembelian hero.

Klik plus pada saldo Diamond untuk mencoba top up. Di Koleksi, klik Hadiah match untuk mencoba WIN/LOSE. Pada halaman Player, buat player baru untuk menunjukkan default saldo, ubah nickname, lalu demonstrasikan penghapusan jika diperlukan. Nilai statistik akan mengikuti perubahan data tersebut.

Jika ingin mengulang pembelian Freya dan Layla dari nol, hentikan server, jalankan `npm run demo:reset:neon`, lalu `npm run start:neon`. Pilih MageSurabaya. Beli Layla dengan BP, top up 706 Diamond, beli Freya dengan Diamond, lalu ambil hadiah WIN: saldo akhirnya 8300 BP dan 107 Diamond.

## 9. Penutup dan pengumpulan

Tunjukkan hasil Test Results pada Postman. Dua assertion tersedia pada tiap request: HTTP status dan hasil response. Saat 28 request dijalankan berurutan dari seed, seluruh 56 assertion seharusnya lulus.

Jelaskan pembagian tugas kelompok yang sebenarnya. Unggah source ke repository public bernama `pweb-express-[nomor kelompok]-2026`, isi identitas di KELOMPOK.md, dan kumpulkan tautan sesuai arahan asisten. Ikuti ketentuan formulir dan jadwal kelasmu.

Screenshot tampilan tersedia pada screenshots/. Laporan pengujian lokal ada pada docs/HASIL-PENGUJIAN.md. Screenshot tersebut menunjukkan demo pada database pengujian; lakukan rekaman akhir dengan Neon milik kelompokmu.

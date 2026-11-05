# Hasil pengujian perbaikan versi 1.1

Pemeriksaan 5 November 2026, Node.js 24.22.1, npm 11.9.0, Linux.

## Proses mulai yang benar-benar dijalankan

Source disalin ke folder baru bernama **MLBB Shop Uji é**, tanpa node_modules, Prisma Client, dist, .cache, .env, atau database lokal bawaan. Entry yang dijalankan adalah **node scripts/start.mjs**, sama dengan npm start dan file peluncur.

| Tahap | Hasil |
| --- | --- |
| Menemukan npm dari instalasi Node | Berhasil |
| Memasang dependency otomatis memakai npm ci | Berhasil |
| Membuat Prisma Client otomatis | Berhasil |
| Membuat schema dan seed database lokal | 133 hero, 892 skin, 3 player, 4 kepemilikan |
| Menjalankan web/API tanpa .env | Berhasil; /health menampilkan mode local |
| Port yang diminta sedang dipakai | Beralih ke port berikutnya; URL collection diperbarui |
| Collection melalui server yang baru dinyalakan | 28 request, 56 assertion, 0 gagal |
| Restart melalui entry yang sama | Transaksi dipertahankan, seed tidak menimpa data |
| Build dan menjalankan dist/local.js | Berhasil; data yang sama tetap terbaca |

Setelah urutan Postman dan restart: 134 hero (termasuk Collie), 892 skin, 3 player (player 4 sudah dihapus), 6 kepemilikan, dan total 3074 Diamond.

## Pemeriksaan otomatis lain

| Pemeriksaan | Hasil |
| --- | --- |
| Test API dan startup | 41 lulus, 0 gagal |
| Test konfigurasi Neon | 9 lulus, 0 gagal |
| TypeScript build | Berhasil |
| Audit dependency produksi | 0 kerentanan terlapor pada saat pemeriksaan |

Test startup menjalankan proses aplikasi, mengubah saldo, menghentikan server, memulai lagi, dan memastikan data tetap ada. Reset lokal mengembalikan seed. Pengunci mencegah dua server pada folder yang sama menulis database sekaligus; pengunci dari proses yang sudah mati dapat dipulihkan tanpa menghapus data.

Validasi konfigurasi mencakup URL pooling/direct, placeholder, branch berbeda, port, penyalinan perintah psql/kutip/assignment, serta pembentukan alamat direct dari URL pooling Neon.

## Lingkungan dan batas pemeriksaan

Mode lokal memakai PostgreSQL WASM (PGlite), SQL migrasi proyek, dan proxy WebSocket pada 127.0.0.1 melalui PrismaNeon. Pengaturan transport lokal hanya digunakan oleh proses lokal. Mode Neon berjalan sebagai proses terpisah dengan koneksi cloud normal.

File CMD ditulis dengan CRLF dan menjalankan entry Node yang sama. Pemeriksaan ini belum mengeksekusi CMD pada Windows fisik atau memakai kredensial Neon pengguna. Koneksi Neon harus diperiksa melalui JALANKAN-NEON.cmd / npm run start:neon dengan akun kelompok. Mode lokal tidak menggantikan syarat Neon pada tugas.

Lima screenshot pada screenshots/ berasal dari pemeriksaan tampilan tanggal 4 November. Desain tetap sama pada versi 1.1, dengan keterangan mode aktif ditambahkan pada footer.

## Bukti dan pengulangan

- test-results/api-tests.txt: 41 test API/startup.
- test-results/environment-tests.txt: 9 test konfigurasi.
- test-results/startup-report.json: hasil entry dari folder bersih, Postman, restart, dan runtime hasil kompilasi.
- test-results/startup-run.txt: output pemasangan, startup, 56 assertion Newman, restart, dan penutupan.
- test-results/audit-production.json: audit dependency produksi.

```powershell
npm test
npm run test:env
npm run build
```

Jika startup di komputer lain masih gagal, file logs/startup.log berisi pesan terbaru. Salin teks error tersebut untuk diagnosis; jangan membagikan .env atau password Neon.

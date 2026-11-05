# Screenshot demo

Diambil 4 November 2026. Versi 1.1 mempertahankan tampilan ini dan menambahkan informasi mode lokal/Neon pada footer. Laporan startup terbaru tersedia pada docs/HASIL-PENGUJIAN.md.

Gambar berikut diambil langsung dari aplikasi yang berjalan, menggunakan database PostgreSQL pengujian terisolasi. Angka saldo berasal dari transaksi API yang benar-benar dijalankan.

| File | Isi |
| --- | --- |
| 01-katalog-hero.jpg | Katalog 133 hero dan artwork |
| 02-detail-dan-harga-layla.jpg | Detail Layla, pilihan mata uang, harga, dan skin |
| 03-koleksi-hasil-pembelian.jpg | Layla dibeli 2000 BP dan Freya 599 Diamond; sisa 8000 BP dan 107 Diamond sebelum hadiah match |
| 04-skin-layla.jpg | Filter Layla menghasilkan 11 skin; saldo sesudah WIN menjadi 8300 BP |
| 05-statistik.jpg | Statistik 3 player, 6 kepemilikan, 3074 Diamond, dan Layla paling banyak dimiliki |

Screenshot frontend tidak menggantikan bukti koneksi Neon atau rekaman kelompok. Hasil 28 request Postman diverifikasi melalui Newman dan disimpan terpisah pada docs/test-results/. Tidak ada screenshot Neon atau Postman VS Code yang direkayasa.

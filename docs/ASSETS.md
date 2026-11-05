# Dataset dan aset

## Dataset penugasan

Sumber: [Mlbb Dataset.zip dari tautan pada modul](https://drive.google.com/file/d/1pwBUD6HnjybfGc4sobwSDYF7myHA7rW3/view).

Arsip sumber berisi heroes.csv dan skins.csv. Keduanya dikonversi menjadi JSON dengan angka bertipe number dan sel harga kosong menjadi null. Urutan baris tetap dipertahankan. CSV asli disertakan di data/source. Seed hanya memasukkan kolom yang diminta pada tugas.

## Artwork

Ilustrasi Mobile Legends: Bang Bang milik MOONTON. Sumber arsip: [Sparkies01/Splash](https://github.com/Sparkies01/Splash). Aset dipakai untuk demonstrasi lokal dalam proyek pendidikan; proyek ini tidak menyatakan diri sebagai toko atau produk resmi MOONTON.

133 gambar hero dan 31 gambar skin disimpan dalam format WebP untuk memperkecil ukuran paket. Manifest public/assets/artwork.json mencatat path sumber setiap gambar. Untuk hero terakhir, nama pada dataset tetap Hirara; arsip artwork menggunakan folder Hiara.

850 skin memiliki pasangan artwork pada manifest. Skin yang belum memiliki pasangan tetap menampilkan nama, hero, rarity, dan harga dari database. Sebagian gambar skin dimuat dari arsip daring ketika halaman dibuka. Semua 892 record skin tetap masuk ke database.

## Font

- DM Sans: Google Fonts, SIL Open Font License.
- Barlow Condensed: Google Fonts, SIL Open Font License.

File font dibundel, beserta teks lisensinya pada public/assets/fonts/.

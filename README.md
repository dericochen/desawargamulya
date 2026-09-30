# Website Desa Marga Mulya

Website berbahasa Indonesia untuk demonstrasi EcoQuest, dengan tujuh halaman publik dan CMS admin. Konten tersimpan di database; perubahan admin langsung digunakan halaman pengunjung.

**Website online:** https://desa-marga-mulya-gamma.vercel.app  
**Admin:** https://desa-marga-mulya-gamma.vercel.app/admin

Diterbitkan dan diperiksa pada 30 September 2026. Proyek Vercel: `sunib1/desa-marga-mulya`. Database Neon: `desa-marga-mulya-db`, paket Free, region Singapura; server API juga menggunakan region Singapura. Akses admin produksi tersimpan dalam file privat `AKSES-ADMIN-ONLINE.txt` di komputer pemilik, terpisah dari paket sumber.

## Mencoba di komputer

Gunakan Node.js 22.13 atau lebih baru (disarankan Node.js 24).

```sh
npm ci
npm run build
npm start
```

Buka http://localhost:4173 untuk pengunjung dan http://localhost:4173/admin untuk admin. Pada pemakaian lokal pertama, sistem membuat akun admin dengan kata sandi acak dan menuliskannya dalam `AKSES-ADMIN-LOKAL.txt`. File ini bersifat privat, tidak termasuk paket sumber atau deployment. Kata sandi bisa diganti melalui menu Akun admin. Database lokal berada di `data/village.sqlite`; simpan folder data jika memindahkan instalasi lokal.

## Halaman dan fitur

| Halaman | Fungsi |
|---|---|
| Beranda | Pengantar desa, informasi unggulan, agenda terdekat, angka desa, produk unggulan |
| Profil desa | Profil, sejarah, wilayah, visi-misi, statistik dan grafik |
| Informasi | Artikel dan pengumuman, pencarian, filter kategori, detail |
| Agenda | Kalender klik tanggal, pindah bulan, kategori, detail waktu/lokasi/status, produk terkait |
| Lapak desa | Katalog, pencarian, filter kategori, harga, penjual, pengajuan produk, cek status |
| Galeri | Foto, kategori, keterangan dan sumber foto |
| Kontak | Alamat, jam pelayanan, telepon, email dan tautan petunjuk arah |

CMS memiliki pengelolaan profil, identitas, statistik, navigasi, pengantar halaman, kategori, kredit foto, artikel, agenda, produk, galeri, serta kata sandi admin. Draf dan arsip tidak ditampilkan ke publik.

## Alur Lapak Desa

1. Warga mengirim produk, foto, harga, identitas usaha, wilayah dan nomor kontak dengan persetujuan publikasi.
2. Sistem menyimpan pengajuan sebagai **Menunggu peninjauan**, apa pun status yang dikirim pengguna.
3. Warga menerima kode privat untuk memeriksa status pengajuan.
4. Admin membuka **Lapak & pengajuan**, meninjau kelengkapan, lalu memilih **Terbit**, **Perlu perbaikan**, atau **Ditolak**. Perbaikan dan penolakan wajib disertai catatan.
5. Produk dan fotonya tersedia untuk publik hanya setelah diterbitkan. Kontak membuka WhatsApp penjual; website tidak memproses pembayaran.
6. Admin bisa menghubungkan produk terbit dengan kegiatan yang relevan, misalnya bazar desa.

Perbaikan pengajuan dilakukan bersama pengelola melalui saluran kontak desa. Akun penjual, checkout, pembayaran, pengiriman, dan notifikasi otomatis belum termasuk versi ini.

## Data demonstrasi dan referensi

Dokumen [Data EcoQuest IIT Challenge 2026](https://www.canva.com/design/DAHUOBlDerM/XZha5NlhvEsz6u4cI7wcgQ/view) memuat struktur data A–M, bukan nilai desa yang sudah terisi. Konten contoh menggunakan struktur geografis, kependudukan, ekonomi, kegiatan masyarakat, dan UMKM. Ketentuan lomba mengizinkan pemilihan data yang relevan dan mewajibkan data dummy mengikuti referensi.

Seluruh angka, visi-misi, nama usaha, dan agenda pada versi awal adalah contoh. Alamat, telepon, email, dan lokasi peta resmi sengaja belum diisi karena tidak tersedia dalam sumber. Admin dapat melengkapinya. Penanda demonstrasi sebaiknya tetap aktif sampai data resmi diperiksa.

Referensi pola informasi: [Website Desa Punggurharjo](https://punggurharjo-rembang.desa.id/index.php/). Referensi keberadaan fitur promosi usaha pada platform desa: [Digital Desa](https://digitaldesa.id/artikel/desa-dalam-genggaman). Keunggulan proyek yang ditawarkan adalah alur kegiatan–produk yang terhubung dan moderasi yang dapat diperagakan, bukan klaim bahwa kalender atau marketplace belum pernah ada.

Foto bersumber dari Wikimedia Commons. Atribusi lengkap tersedia pada footer **Sumber & kredit foto** dan dapat dikelola admin. Foto diperkecil, dikonversi ke WebP, dan dipotong secara visual sesuai tata letak; salinan olahan mengikuti lisensi asal.

| File | Pembuat dan sumber | Lisensi |
|---|---|---|
| hero.webp | [Thomas Fuhrmann — Rice terraces in Java](https://commons.wikimedia.org/wiki/File:Rice_terraces_in_Java_-_Indonesia.jpg) | CC BY-SA 4.0 |
| vegetables.webp | [Midori — Indonesian vegetables](https://commons.wikimedia.org/wiki/File:Indonesian_vegetables.JPG) | CC BY-SA 3.0 |
| rice.webp | [Sanjay Acharya — Unpolished rice](https://commons.wikimedia.org/wiki/File:Unpolished-rice.jpg) | CC BY-SA 3.0 |
| basket.webp | [Abdulrohmatt — Woman weaving a bamboo basket](https://commons.wikimedia.org/wiki/File:Woman_weaving_a_bamboo_basket,_Tasikmalaya.jpg) | CC BY-SA 4.0 |
| weave.webp | [Dinata Juan — Sidetapa anyam bambu](https://commons.wikimedia.org/wiki/File:20180707_Sidetapa_anyam_bambu.jpg) | CC BY-SA 4.0 |

Semua foto merupakan ilustrasi, bukan dokumentasi desa. Tipografi menggunakan DM Sans dan Lora dari Google Fonts, dengan fallback lokal. Ikon memakai Lucide. Lisensi paket terdapat dalam distribusi dependensi masing-masing.

## Penerbitan ke Vercel

Project berisi konfigurasi Vercel dan endpoint server. Gunakan preset Vite, perintah build `npm run build`, keluaran `dist`, dan runtime Node.js 24.x. Frontend dan API harus diterbitkan bersama dari folder proyek ini.

Siapkan database **Neon Postgres** dan tiga environment variable di Vercel:

| Variabel | Isi |
|---|---|
| DATABASE_URL | Connection string Neon Postgres untuk database proyek ini |
| ADMIN_EMAIL | Email akun admin awal |
| ADMIN_PASSWORD | Kata sandi awal unik, minimal 12 karakter |

Isi variabel sebelum deployment yang akan digunakan. Jangan menaruh kredensial dalam kode, repository, chat publik, atau variabel berawalan `VITE_`. Aplikasi membuat tabel dan contoh konten saat database pertama diakses. Kredensial awal hanya dipakai sekali; perubahan berikutnya melalui CMS. Data SQLite lokal tidak otomatis berpindah ke Neon. Jangan gunakan database milik proyek lain.

Database permanen wajib diatur. Aplikasi sengaja gagal saat dijalankan di Vercel tanpa `DATABASE_URL`, sehingga tidak memberi kesan palsu bahwa perubahan sudah tersimpan. Penggunaan gambar yang diunggah disimpan terpisah dari isi konten dan dikirim melalui URL, untuk menghindari respons JSON besar.

Setelah terbit, periksa `/api/health`, tujuh halaman publik, login admin, perubahan konten, pengajuan, persetujuan, dan foto pengajuan. Pastikan URL produksi bisa dibuka tanpa login Vercel. Biaya dan batas pemakaian Vercel/Neon mengikuti paket akun pemilik.

## Pemeriksaan

```sh
npm run check
npm run build
```

Uji integrasi memakai database terpisah dalam `.test-data/`: akses admin, cookie sesi, penolakan permintaan lintas situs, pengajuan tetap pending, kerahasiaan foto pending, kepemilikan gambar, catatan moderasi, persetujuan, arsip, konflik perubahan, validasi tanggal, draf, simpan konten, hapus dan logout.

Pemeriksaan browser dilakukan pada tujuh halaman di lebar 1440, 768, 390, dan 320 piksel; profil, pencarian, kalender, modal, unggahan foto, serta login dan menu admin juga diperiksa. Kesesuaian tampilan bukan audit aksesibilitas formal.

Pemeriksaan produksi Vercel berhasil: akses publik tanpa login Vercel, koneksi database, login admin dengan cookie Secure, baca CMS, pembuatan/perubahan/persistensi draf, draf tidak bocor ke publik, logout, pengajuan lapak, foto pending privat, pelacakan status, persetujuan, dan foto/produk tampil setelah terbit. Rekaman uji sementara telah dihapus.

## Kesesuaian lomba dan demo

- Bahasa Indonesia; tujuh halaman publik, di bawah batas sepuluh. Detail artikel/produk/agenda berada dalam dialog pada halaman terkait. Admin tidak dihitung sebagai halaman publik.
- Lima bagian wajib tersedia: Home, Profile, Information, Gallery, Contact.
- Isi desa dibaca dari database dan dikelola CMS; label tindakan umum merupakan bagian antarmuka.
- Agenda dan lapak relevan dengan kegiatan masyarakat dan UMKM pada struktur data panitia.
- Tautan produksi Vercel tetap harus diverifikasi aktif selama lomba.

Urutan demo singkat: buka profil/data → klik tanggal agenda → buka produk yang terkait kegiatan → ajukan produk warga → masuk admin dan setujui → kembali ke lapak untuk melihat produk tampil. Siapkan satu pengajuan contoh sebelum presentasi agar waktu lima menit cukup. Berkas presentasi dan pengiriman formulir lomba tidak termasuk implementasi website ini.

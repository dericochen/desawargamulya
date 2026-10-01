# Website Desa Marga Mulya — Portal Digital Desa

Portal Digital Desa Marga Mulya, Kecamatan Mauk, Kabupaten Tangerang, Banten, berbahasa Indonesia untuk EcoQuest: informasi desa, wisata pesisir, peta fasilitas, pengaduan bertiket, asisten desa dan chat admin, nomor darurat, cuaca, pembangunan, serta transparansi bantuan. Konten tersimpan di database; perubahan admin langsung digunakan halaman pengunjung.

**Website online:** https://desa-marga-mulya-gamma.vercel.app  
**Admin:** https://desa-marga-mulya-gamma.vercel.app/admin

Diterbitkan dan diperiksa pada 30 September 2026. Proyek Vercel: `sunib1/desa-marga-mulya`. Database Neon: `desa-marga-mulya-db`, paket Free, region Singapura; server API juga menggunakan region Singapura. Akses admin produksi tersimpan dalam file privat `AKSES-ADMIN-ONLINE.txt` di komputer pemilik, terpisah dari paket sumber.

## Mencoba di komputer

Gunakan Node.js 24 (versi dikunci ke 24.x agar runtime Vercel tidak berubah selama kompetisi).

```sh
npm ci
npm run build
npm start
```

Buka http://localhost:4173 untuk pengunjung dan http://localhost:4173/admin untuk admin. Pada pemakaian lokal pertama, sistem membuat akun admin dengan kata sandi acak dan menuliskannya dalam `AKSES-ADMIN-LOKAL.txt`. File ini bersifat privat, tidak termasuk paket sumber atau deployment. Kata sandi bisa diganti melalui menu Akun admin. Database lokal berada di `data/village.sqlite`; simpan folder data jika memindahkan instalasi lokal.

## Halaman dan fitur

| Halaman | Fungsi |
|---|---|
| Beranda | Hero, akses cepat (Pengaduan, Tanya Desa, Wisata, Pembangunan, Peta Desa, Darurat), pengumuman, cuaca, profil singkat, potensi, wisata, pembangunan, data desa, galeri carousel, berita, peta, kontak |
| Profil desa | Profil, sejarah, wilayah, visi-misi, statistik dan grafik |
| Informasi (`/informasi`) | Tab Berita & pengumuman dan tab Agenda (kalender, pendaftaran peserta/lapak bazar) |
| Galeri (`/galeri`) · Lapak desa (`/lapak`) | Galeri lengkap per kategori; katalog produk warga dengan moderasi |
| Wisata (`/wisata`) | Kartu destinasi, detail (foto, alamat, jam, tiket, fasilitas, galeri, peta, kontak, petunjuk arah) |
| Peta Desa (`/peta-desa`) | Peta Google Maps: geser, zoom, layar penuh, filter kategori, popup + petunjuk arah, daftar lokasi |
| Transparansi (`/transparansi`) | Tab Pembangunan (progres, anggaran, dokumentasi sebelum/proses/selesai, timeline) dan tab Bantuan (program, dokumentasi, penerima tersamar) |
| Layanan warga (`/pengaduan`) | FAQ dahulu, lalu pengaduan bertiket TIK-001, tab cek tiket, Asisten Desa, chat admin |
| Kontak | Alamat, jam, telepon, email, peta interaktif kantor desa, tombol "Buka di Google Maps" |

Total **10 halaman publik**: Beranda, Profil, Informasi, Galeri, Lapak, Wisata, Peta Desa, Layanan warga, Transparansi, Kontak. Pencarian (tombol **Cari**), Asisten Desa, dan nomor darurat berupa dialog, bukan halaman. Alamat lama (`/agenda`, `/pembangunan`, `/bantuan`, `/pengaduan/cek`, `/tanya-desa`, `/cari`) otomatis diarahkan ke halaman gabungan.

Tombol **Darurat** (header, akses cepat, footer) membuka lembar nomor 112/110/119/113 dan kontak lokal dengan tautan `tel:`.

## Portal Digital Desa — cara kerja

- **Data dinamis.** Wisata, fasilitas, galeri, FAQ, menu chatbot, nomor darurat, pengaduan, pesan, pembangunan, bantuan, dokumentasi, dusun dan RT/RW tersimpan di database dan dikelola dari admin. Tabel baru dibuat otomatis (`CREATE TABLE IF NOT EXISTS`) tanpa menghapus data lama; definisinya ada di `server/portal-schema.mjs`.
- **Pengaduan.** Nomor tiket `TIK-001`, `TIK-002`, … berasal dari penghitung database (tidak dipakai ulang). Halaman cek tiket hanya menampilkan kategori, dusun, status dan catatan petugas; nama, nomor, isi dan foto hanya untuk admin. Admin mengubah status BARU → DIVERIFIKASI → DIPROSES → SELESAI/DITOLAK beserta catatan.
- **Asisten Desa.** Bot menu angka (bukan AI) yang dibaca dari tabel `chatbot_nodes`/`chatbot_options`. Pilihan dapat membuka menu lain, formulir pengaduan berkategori, cek tiket, FAQ, halaman website, nomor darurat, atau menghubungkan ke admin.
- **Pesan Warga.** Warga yang dihubungkan ke admin mendapat kode rahasia di perangkatnya; admin membalas di inbox (status belum dibaca, selesai/buka kembali, kategori). Pembaruan memakai polling ringan tiap 5–6 detik karena stack ini tidak memiliki layanan realtime; tidak ada teknologi baru yang ditambahkan.
- **Peta dan cuaca.** Google Maps dimuat terpisah hanya saat peta dibuka. Cuaca dari Open-Meteo (tanpa API key) berdasarkan koordinat desa, maksimal 3 hari, dengan pesan cadangan bila gagal.
- **Foto ganda & slide.** Setiap isian foto (berita, galeri, produk, pengajuan lapak, wisata, fasilitas, pembangunan, dokumentasi, bantuan, pengaduan) menerima hingga 3 foto; foto pertama menjadi sampul. Di halaman detail foto dapat digeser (swipe, tombol panah, titik, atau tombol panah keyboard); kartu menampilkan penanda jumlah foto. Kolom tambahan `<kolom>_more` ditambahkan dengan migrasi aditif (`ALTER TABLE ... ADD COLUMN`).
- **Lapak Desa di Beranda.** Bagian Lapak Desa tampil tepat setelah pengumuman: hingga 6 produk terbit, filter kategori, tombol **Ajukan produk** (langsung membuka formulir di /lapak?ajukan=1) dan **Lihat semua produk**; di ponsel kartu produk dapat digeser.
- **Tampilan Beranda (admin).** Logo desa, slide foto utama (maks. 5, berganti tiap 6 detik, bisa dijeda), dua tombol foto utama, bagian beranda yang tampil beserta urutannya, dan motif latar (gelombang pesisir, anyaman bambu, atau polos).
- **Latar budaya Banten & animasi.** Latar bawaan putih polos yang seluruhnya dilapisi pola ragam hias khas Banten (bunga, kipas kerang, gelombang) yang sangat samar dan halus, diolah dari lembar CC BY-SA *75 Ragam Hias Khas Banten* (bukan gambar AI); garis ragam hias Banten sebagai pembatas, tenun Baduy (bagian kain saja) pada pita gelap dan footer, serta perahu nelayan pesisir Banten yang dipudarkan di bagian wisata. Olahan: dipotong, diburamkan, diwarnai ulang, dan dibuat transparan; atribusi ada di **Sumber & kredit foto**. Animasi: muncul saat digulir, slide beranda dengan zoom lembut, angka statistik menghitung naik, kartu terangkat saat disorot, transisi halaman, dan dialog. Semua animasi mati otomatis bila perangkat meminta gerak dikurangi (*prefers-reduced-motion*).
- **Penyimpanan foto.** Foto unggahan disimpan di database. Unggahan ditolak bila total foto melewati `MEDIA_LIMIT_MB` (bawaan 300 MB) agar database paket gratis tidak penuh; pemakaian tampil di Dashboard admin.
- **Keamanan.** Semua rute `/api/admin/*` memakai sesi admin yang sama. Validasi server untuk semua input, foto hanya JPG/PNG/WebP ≤ 1,5 MB dengan pemeriksaan isi file, batas laju untuk pengaduan dan chat, foto pengaduan privat, foto destinasi/proyek nonaktif ikut tersembunyi, dan foto lama dihapus saat diganti atau datanya dihapus.

## Data desa (struktur dokumen EcoQuest A–M)

Tab **Data desa** di Profil menampilkan kelompok data sesuai dokumen [Data EcoQuest IIT Challenge 2026](https://www.canva.com/design/DAHUOBlDerM/XZha5NlhvEsz6u4cI7wcgQ/view): A. Geografi & penggunaan lahan, B. Pemerintahan, C. Kependudukan, mata pencaharian & pendidikan penduduk, E. Pendidikan, F. Kesehatan & lingkungan, G. Pertanian/perikanan/peternakan, H. Ekonomi, I. Infrastruktur jalan, J. Budaya, K. Wisata, L. Organisasi, M. UMKM. Semua nilai adalah data dummy dan dapat diubah di admin (**Statistik**): tambah/hapus kelompok dan baris, pilih tabel atau grafik batang. Bagian **D. Agama** sengaja tidak ditampilkan untuk mematuhi larangan konten SARA; karena alasan yang sama, tempat ibadah tidak dimuat di Peta Desa dan kategori ibadah dihapus. Dokumen panitia mengizinkan pemilihan data (poin 6), sehingga pilihan ini dapat dijelaskan saat tanya jawab.

Teks beranda yang berisi informasi desa (judul profil singkat, pengantar wisata/potensi/pembangunan/peta, lokasi cuaca, wilayah administratif di Kontak) juga dikelola dari **Pengaturan Website**.

## Tata kelola data & keamanan pengaduan

- **Label status data.** Wisata, fasilitas, nomor penting, pembangunan, dan bantuan memiliki kolom *Status data* yang tampil sebagai label: **Terverifikasi desa**, **Sumber pemerintah** (mis. sekolah dari NPSN Kemendikdasmen, nomor darurat nasional), **Perlu verifikasi** (perkiraan), atau **Data contoh**. Admin mengubah label setelah data diperiksa.
- **Nomor darurat.** Hanya nomor nasional (112, 110, 119, 113) yang tampil. 112 dikelola pemerintah daerah sehingga ketersediaannya bisa berbeda; keterangannya mengarahkan ke 110/119/113 bila tidak tersambung. Kontak lokal disembunyikan sampai diverifikasi dan diaktifkan admin.
- **Kode tiket.** Setiap pengaduan mendapat satu kode yang langsung bisa disalin, misalnya **TIK-004-K7Q**: nomor urut ditambah 3 karakter acak (tanpa 0/O dan 1/I agar tidak salah ketik). Karena nomor urut mudah ditebak, bagian acak inilah yang mencegah orang mengintip tiket warga lain; bagian acak hanya disimpan sebagai hash dan pengecekan dibatasi 20 kali per 10 menit. Pelapor yang kehilangan kode dapat dibuatkan kode baru oleh admin. Tiket lama dengan PIN 6 angka tetap bisa dicek (TIK-001-123456). Setelah pengaduan selesai, pelapor dapat memberi penilaian 1–5; rata-ratanya dan jumlah laporan per kategori tampil di Dashboard admin tanpa identitas.
- **Metadata foto.** Server menghapus EXIF (termasuk lokasi GPS), XMP, dan teks tersemat dari setiap unggahan JPEG, PNG, dan WebP sebelum disimpan.
- **Kondisi pesisir.** Beranda menampilkan gelombang (Open-Meteo Marine) dan angin dengan kategori gelombang BMKG, penanda waspada untuk perahu kecil (gelombang ≥ 1,25 m atau angin ≥ 28 km/jam), tombol lapor banjir/rob dan sampah pantai, serta tautan ke BMKG Maritim. Ini perkiraan model, bukan peringatan resmi.

## Penggunaan AI

Asisten AI dipakai untuk membantu menulis kode, menyusun konten contoh, dan mencari masalah. Seluruh hasil ditinjau, diuji (29 tes integrasi otomatis dan pemeriksaan browser), dan disesuaikan oleh tim. Website tidak memakai AI generatif untuk melayani warga: Asisten Desa adalah menu pilihan yang isinya ditentukan admin, dan pengaduan ditangani petugas. Gambar di website bukan gambar buatan AI.

## Sumber data lokasi

Koordinat pusat desa berasal dari tautan peta yang diberikan pemilik proyek (-6.0353563, 106.5260001). Sekolah di peta (SD Negeri Margamulya, SD Negeri Ketapang, MIS Raudhatul Hidayah 2, KB Al-Fikri) diambil dari **Data Referensi Kemendikdasmen** (data pemerintah terbuka, halaman NPSN), termasuk koordinat yang terdaftar. OpenStreetMap untuk wilayah ini belum memuat sekolah, lapangan, atau fasilitas olahraga, sehingga lapangan, lapangan bulu tangkis, danau/situ, dan ruang terbuka lain perlu ditambahkan admin lewat kategori baru **Lapangan & olahraga** dan **Taman, danau & ruang terbuka**. Lokasi 4 pantai dan fasilitas lain (Kantor Desa, Kantor Kecamatan, Puskesmas, Klinik Melati, Apotek Syarah Farma, Polsek, Pos Damkar, ATM Mandiri, Pasar Mauk, SPBU 34.155.03) serta nomor lokal (Polsek, Damkar, Kantor Desa, JK Park) adalah **data perkiraan untuk demonstrasi** dan diberi keterangan "perlu diverifikasi pemerintah desa" di website. Sebelum dipakai sungguhan, koordinat dan nomor wajib diperiksa pemerintah desa (misalnya survei lapangan atau OpenStreetMap) lalu diperbarui lewat admin. Catatan jujur untuk tim: titik awal tersebut dicari dari hasil pencarian Google Maps saat pengembangan. Karena ketentuan layanan Google membatasi penggunaan ulang datanya, website tidak lagi menyebut Google Maps sebagai sumber dan data ini hanya diperlakukan sebagai perkiraan demonstrasi yang harus diganti dengan hasil verifikasi desa. Peta di website memakai OpenStreetMap. Nomor Puskesmas belum tersedia sehingga kontaknya nonaktif sampai diisi admin. Harga tiket, jam buka, dan fasilitas wisata sengaja kosong ("Informasi belum tersedia").

Situs resmi `margamulya-mauk.desa.id` tidak dapat diakses otomatis (proteksi Cloudflare), sehingga pembagian dusun dan RT/RW resmi belum diverifikasi. Seed hanya berisi Dusun I–IV tanpa RT/RW; lengkapi lewat menu **Wilayah / Dusun**. Proyek pembangunan dan program bantuan bertanda "(contoh)" adalah data demonstrasi. Website `margamulya.kobar.id` hanya dipakai sebagai referensi fitur.

## Alur Lapak Desa

1. Warga mengirim produk, foto, harga, identitas usaha, wilayah dan nomor kontak dengan persetujuan publikasi. Foto wajib diunggah langsung (JPG, PNG, atau WebP); tautan gambar dari situs lain tidak diterima pada pengajuan publik.
2. Sistem menyimpan pengajuan sebagai **Menunggu peninjauan**, apa pun status yang dikirim pengguna.
3. Warga menerima kode privat untuk memeriksa status pengajuan.
4. Admin membuka **Lapak & pengajuan**, meninjau kelengkapan, lalu memilih **Terbit**, **Perlu perbaikan**, atau **Ditolak**. Perbaikan dan penolakan wajib disertai catatan.
5. Produk dan fotonya tersedia untuk publik hanya setelah diterbitkan. Kontak membuka WhatsApp penjual; website tidak memproses pembayaran.
6. Admin bisa menghubungkan produk terbit dengan kegiatan yang relevan, misalnya bazar desa.

Perbaikan pengajuan dilakukan bersama pengelola melalui saluran kontak desa. Akun penjual, checkout, pembayaran, pengiriman, dan notifikasi otomatis belum termasuk versi ini.

## Pendaftaran kegiatan (peserta & lapak bazar)

1. Admin membuka pendaftaran pada agenda: kuota peserta, kuota lapak bazar (isi 0 jika tidak dipakai), dan batas tanggal opsional. Tanpa batas tanggal, pendaftaran ditutup saat kegiatan dimulai.
2. Warga mendaftar dari detail agenda dengan nama, alamat, HP/WhatsApp, RT dan RW; pendaftar lapak juga mengisi nama usaha dan produk. Data pribadi tidak pernah ditampilkan ke publik.
3. Setiap pendaftaran berstatus **Menunggu peninjauan** dan mendapat kode privat untuk **Cek pendaftaran** di halaman Agenda. Nama dan nomor yang sama tidak bisa mendaftar dua kali untuk jenis yang sama.
4. Admin menyetujui, meminta perbaikan, menolak, atau membatalkan (tiga terakhir wajib catatan). Kuota hanya terpakai setelah disetujui dan tidak bisa terlampaui walau persetujuan dilakukan bersamaan; kuota juga tidak bisa diturunkan di bawah jumlah yang sudah disetujui.
5. Pemohon yang diminta perbaikan dapat mengirim ulang data dengan kode privatnya. Admin dapat mencatat kehadiran dan menghubungkan lapak yang disetujui dengan produk Lapak Desa yang sudah terbit.
6. Agenda yang ditunda, dibatalkan, selesai, draf, atau arsip tidak menerima pendaftaran. Agenda yang sudah punya pendaftar tidak bisa dihapus, hanya diarsipkan.

Batas waktu pendaftaran dihitung menurut **zona waktu desa** (menu Kontak & jadwal, misalnya `Asia/Jakarta`, `Asia/Makassar`, `Asia/Jayapura`). Jika zona waktu diubah, batas waktu semua agenda dihitung ulang otomatis.

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

Foto utama beranda adalah perahu nelayan di Pantai Tanjung Pasir, Tangerang (Banacama, Wikimedia Commons, CC BY-SA 4.0) sebagai ilustrasi pesisir. Semua foto kecuali Kantor Desa Marga Mulya dan Kantor Kecamatan Mauk (foto asli oleh Enperfectify World, Wikimedia Commons, CC BY-SA 4.0, 28 Agustus 2024) merupakan ilustrasi, bukan dokumentasi desa. Wisata, pembangunan, dan bantuan sengaja memakai placeholder sampai admin mengunggah foto asli; tidak ada gambar buatan AI. Tipografi menggunakan DM Sans dan Lora dari Google Fonts, dengan fallback lokal. Ikon memakai Lucide. Peta memakai Google Maps JavaScript API. Lisensi paket terdapat dalam distribusi dependensi masing-masing.

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

Uji integrasi (29 tes) memakai database sementara dalam `.test-data/` yang dihapus otomatis setelah selesai. Selain alur lama (akses admin, cookie sesi, penolakan lintas situs, moderasi lapak, pendaftaran kegiatan), tes portal mencakup: data awal portal, penolakan akses admin tanpa login, CRUD wisata + galeri + marker, foto privat saat nonaktif dan pembersihan media, perubahan FAQ/nomor darurat tampil publik, urutan, RT/RW per dusun, validasi chatbot, tiket berurutan TIK-001/TIK-002, privasi cek tiket, perubahan status + catatan, chat warga–admin (belum dibaca, balasan, isolasi antarwarga, buka kembali), penerima bantuan tersamar + paginasi + impor, dokumentasi pembangunan, dan urutan galeri.

Pemeriksaan browser (Chrome headless, build produksi, database sementara) pada 1440, 768, 390, dan 320 piksel: tanpa error konsol, tanpa gambar rusak, tanpa overflow horizontal; 19 marker peta, detail wisata/pembangunan/bantuan, lembar darurat, alur bot → hubungi admin → chat, formulir pengaduan, serta dashboard, inbox, pengaduan, chatbot, dan editor wisata di admin. Ini bukan audit aksesibilitas formal.

Menu admin: Dashboard · Konten (Berita & pengumuman, Galeri, Agenda, Pendaftaran, Lapak) · Desa (Profil, Wilayah/Dusun, Statistik) · Layanan (Pengaduan, FAQ, Chatbot, Pesan Warga) · Potensi (Wisata, Fasilitas Umum) · Pemerintahan (Pembangunan, Bantuan Sosial — program, penerima, dokumentasi) · Lainnya (Nomor Darurat, Pengaturan Website, Akun).

Pemeriksaan produksi Vercel berhasil: akses publik tanpa login Vercel, koneksi database, login admin dengan cookie Secure, baca CMS, pembuatan/perubahan/persistensi draf, draf tidak bocor ke publik, logout, pengajuan lapak, foto pending privat, pelacakan status, persetujuan, dan foto/produk tampil setelah terbit. Rekaman uji sementara telah dihapus. Fitur pendaftaran kegiatan dan perbaikan zona waktu ditambahkan setelah pemeriksaan tersebut; periksa ulang di produksi setelah deployment berikutnya.

## Kesesuaian lomba dan demo

- Bahasa Indonesia; tepat 10 halaman publik (batas maksimum). Detail artikel/produk/agenda/wisata/proyek/bantuan berada dalam dialog pada halaman terkait. Admin tidak dihitung sebagai halaman publik.
- Lima bagian wajib tersedia: Home, Profile, Information, Gallery, Contact.
- Isi desa dibaca dari database dan dikelola CMS; label tindakan umum merupakan bagian antarmuka.
- Agenda dan lapak relevan dengan kegiatan masyarakat dan UMKM pada struktur data panitia.
- Tautan produksi Vercel tetap harus diverifikasi aktif selama lomba.

Urutan demo singkat (5 menit): Beranda (cuaca, akses cepat) → Profil › Data desa → Wisata dan Peta Desa → Layanan warga: buat pengaduan, dapat nomor TIK → admin mengubah status → warga cek tiket → Asisten Desa → hubungi admin → balasan di Pesan Warga. Produksi sudah berisi contoh TIK-001 (status Diverifikasi) dan satu percakapan contoh. Siapkan rekaman layar sebagai cadangan jika internet lokasi tidak stabil (peta, cuaca, dan database memerlukan internet).

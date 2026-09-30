export const siteSeed = {
  name:'Marga Mulya', identity:'Desa Marga Mulya', area:'Portal informasi & kegiatan masyarakat',
  heroTitle:'Kenali desanya.\nTemukan ceritanya.',
  heroText:'Kabar masyarakat, agenda bersama, dan hasil usaha warga Desa Marga Mulya dalam satu tempat.',
  heroImage:'/images/hero.webp', heroCaption:'Lanskap perdesaan di Jawa · foto ilustrasi',
  about:'Desa Marga Mulya menjadi ruang tumbuh bagi masyarakat, kegiatan bersama, dan usaha lokal. Melalui portal ini, warga dapat mengenal profil desa, mengikuti agenda, serta memperkenalkan produk yang mereka hasilkan.',
  history:'Profil ini merupakan contoh pengisian berdasarkan struktur data panitia EcoQuest. Riwayat pembentukan desa, asal nama, dan peristiwa penting dapat dilengkapi oleh pemerintah desa melalui pengelolaan konten.',
  vision:'Terwujudnya masyarakat desa yang mandiri, sejahtera, dan berdaya melalui pelayanan yang terbuka serta pengembangan potensi lokal.',
  missions:'Meningkatkan akses informasi dan kualitas pelayanan masyarakat.\nMendorong usaha warga dan pengembangan produk lokal.\nMemperkuat partisipasi masyarakat dalam kegiatan desa.\nMerawat lingkungan dan melestarikan kebudayaan lokal.',
  geography:'Data batas wilayah, luas desa, serta pembagian dusun akan mengikuti hasil pendataan pemerintah desa.',
  address:'Alamat kantor desa belum dikonfirmasi', phone:'', email:'', mapUrl:'',
  hours:'Senin–Jumat, 08.00–15.00 (contoh jadwal)', timezone:'Asia/Jakarta',
  footer:'Informasi terbuka, kegiatan bersama, dan ruang tumbuh usaha warga.',
  demo:true, demoNote:'Versi demonstrasi EcoQuest. Isi, angka, nama usaha, dan agenda adalah contoh; foto merupakan ilustrasi.',
  nav:{home:'Beranda',profil:'Profil desa',informasi:'Informasi',agenda:'Agenda',lapak:'Lapak desa',galeri:'Galeri',kontak:'Kontak'},
  pages:{
    profil:{eyebrow:'Mengenal desa',title:'Profil desa',intro:'Identitas, arah pembangunan, dan data masyarakat.'},
    informasi:{eyebrow:'Kabar & pengumuman',title:'Informasi desa',intro:'Ikuti kabar, kegiatan, dan pengumuman yang diterbitkan pengelola desa.'},
    agenda:{eyebrow:'Kegiatan masyarakat',title:'Agenda desa',intro:'Pilih tanggal untuk melihat kegiatan, waktu, dan lokasi pelaksanaan.'},
    lapak:{eyebrow:'Usaha & produk warga',title:'Lapak desa',intro:'Temukan hasil kebun, pangan, dan kerajinan dari usaha warga.'},
    galeri:{eyebrow:'Dokumentasi & potensi',title:'Cerita dalam gambar',intro:'Lingkungan, keterampilan, dan kehidupan masyarakat dalam dokumentasi.'},
    kontak:{eyebrow:'Hubungi pengelola',title:'Kontak desa',intro:'Temukan alamat dan saluran komunikasi yang dikelola pemerintah desa.'}
  },
  labels:{news:'Kabar dari desa',agenda:'Agenda terdekat',market:'Dari tangan warga',stats:'Desa dalam angka',gallery:'Cerita dalam gambar',vision:'Visi desa',mission:'Misi desa'},
  stats:[{label:'Penduduk',value:'2.846',unit:'jiwa'},{label:'Kepala keluarga',value:'842',unit:'KK'},{label:'Wilayah dusun',value:'4',unit:'dusun'},{label:'Usaha lokal',value:'36',unit:'usaha'}],
  population:[{label:'Usia 0–14 tahun',value:672},{label:'Usia 15–64 tahun',value:1874},{label:'Usia 65+ tahun',value:300}],
  occupations:[{label:'Pertanian',value:40},{label:'Wiraswasta',value:27},{label:'Karyawan',value:21},{label:'Lainnya',value:12}],
  dataPeriod:'2026 · data demonstrasi', dataSource:'Contoh sesuai struktur dokumen Data Desa Marga Mulya — EcoQuest',
  sourceUrl:'https://www.canva.com/design/DAHUOBlDerM/XZha5NlhvEsz6u4cI7wcgQ/view',
  credits:[
    {title:'Persawahan di Jawa',author:'Thomas Fuhrmann',source:'https://commons.wikimedia.org/wiki/File:Rice_terraces_in_Java_-_Indonesia.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
    {title:'Sayuran Indonesia',author:'Midori',source:'https://commons.wikimedia.org/wiki/File:Indonesian_vegetables.JPG',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'},
    {title:'Beras',author:'Sanjay Acharya',source:'https://commons.wikimedia.org/wiki/File:Unpolished-rice.jpg',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'},
    {title:'Anyaman bambu Tasikmalaya',author:'Abdulrohmatt',source:'https://commons.wikimedia.org/wiki/File:Woman_weaving_a_bamboo_basket,_Tasikmalaya.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'},
    {title:'Anyaman bambu Sidetapa',author:'Dinata Juan',source:'https://commons.wikimedia.org/wiki/File:20180707_Sidetapa_anyam_bambu.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'}
  ],
  productCategories:['Pangan','Hasil kebun','Kerajinan','Jasa'], eventCategories:['Kegiatan warga','Ekonomi lokal','Pemerintahan','Kesehatan'],
};
const day=(offset)=>{const d=new Date();d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)};
export function seedRecords(){
  return [
    {id:'site',kind:'site',status:'published',data:siteSeed},
    {id:'berita-1',kind:'article',status:'published',data:{title:'Ruang baru untuk mengenalkan usaha warga',category:'Ekonomi lokal',excerpt:'Lapak Desa membuka tempat bagi warga untuk memperkenalkan hasil usaha dan produk lokal.',body:'Lapak Desa mempertemukan pengunjung dengan produk dan usaha warga. Pelaku usaha dapat mengirim pengajuan berisi foto, deskripsi, harga, serta kontak yang boleh ditampilkan.\n\nSetiap pengajuan ditinjau pengelola sebelum terbit. Pengunjung yang tertarik dapat menghubungi penjual secara langsung. Informasi ketersediaan produk diperbarui melalui admin.\n\nArtikel ini merupakan contoh konten demonstrasi.',image:'/images/basket.webp',imageCredit:'Foto ilustrasi · Abdulrohmatt / CC BY-SA 4.0',date:day(-2),featured:true}},
    {id:'berita-2',kind:'article',status:'published',data:{title:'Mencatat kegiatan bersama, menjaga kabar tetap dekat',category:'Kegiatan warga',excerpt:'Kalender desa membantu masyarakat menemukan waktu, lokasi, dan keterangan kegiatan.',body:'Agenda Desa menyajikan daftar kegiatan yang telah diterbitkan pengelola. Pilih tanggal pada kalender untuk melihat agenda hari itu atau gunakan daftar kegiatan terdekat.\n\nPerubahan waktu dan pembatalan diberi penanda agar informasi tetap jelas. Kalender ini diisi dengan kegiatan contoh untuk demonstrasi.',image:'/images/hero.webp',imageCredit:'Foto ilustrasi · Thomas Fuhrmann / CC BY-SA 4.0',date:day(-5),featured:false}},
    {id:'berita-3',kind:'article',status:'published',data:{title:'Informasi desa yang bisa diperbarui bersama',category:'Pengumuman',excerpt:'Profil, data penduduk, dokumentasi, dan kontak disediakan dalam halaman yang mudah ditemukan.',body:'Pengelola dapat memperbarui informasi desa, visi dan misi, data ringkas, serta kontak melalui panel admin.\n\nData pada versi ini merupakan contoh mengikuti struktur dokumen panitia. Angka dan informasi resmi perlu ditinjau pemerintah desa sebelum digunakan untuk pelayanan masyarakat.',image:'/images/weave.webp',imageCredit:'Foto ilustrasi · Dinata Juan / CC BY-SA 4.0',date:day(-8),featured:false}},
    {id:'agenda-1',kind:'event',status:'published',data:{title:'Bazar produk warga',category:'Ekonomi lokal',date:day(3),endDate:day(3),time:'08:00',endTime:'12:00',location:'Halaman balai desa (contoh)',organizer:'Pengelola kegiatan desa (contoh)',description:'Temukan hasil kebun dan kerajinan warga. Agenda demonstrasi ini memperlihatkan hubungan kegiatan desa dengan produk yang tersedia di Lapak Desa.',eventStatus:'Terjadwal',productIds:['produk-1','produk-2'],contact:''}},
    {id:'agenda-2',kind:'event',status:'published',data:{title:'Kerja bakti lingkungan',category:'Kegiatan warga',date:day(7),endDate:day(7),time:'07:00',endTime:'10:00',location:'Lingkungan dusun (contoh)',organizer:'Warga dan pengurus lingkungan (contoh)',description:'Kegiatan bersama untuk merawat kebersihan lingkungan. Waktu, lokasi, dan penyelenggara pada agenda ini merupakan data demonstrasi.',eventStatus:'Terjadwal',productIds:[],contact:''}},
    {id:'agenda-3',kind:'event',status:'published',data:{title:'Pertemuan pelaku usaha lokal',category:'Ekonomi lokal',date:day(12),endDate:day(12),time:'09:00',endTime:'11:00',location:'Ruang pertemuan desa (contoh)',organizer:'Kelompok usaha warga (contoh)',description:'Pertukaran pengalaman pelaku usaha serta pengenalan cara mengajukan produk pada Lapak Desa. Agenda contoh untuk demonstrasi.',eventStatus:'Terjadwal',productIds:['produk-3'],contact:''}},
    {id:'produk-1',kind:'product',status:'published',data:{title:'Beras pilihan hasil panen',category:'Pangan',description:'Contoh produk beras warga dengan kemasan 5 kg. Deskripsi, harga, dan ketersediaan adalah data demonstrasi.',price:68000,unit:'5 kg',seller:'Usaha Pangan Mulya (contoh)',area:'Dusun I (contoh)',phone:'',image:'/images/rice.webp',imageCredit:'Foto ilustrasi · Sanjay Acharya / CC BY-SA 3.0',availability:'Tersedia',consent:true,featured:true}},
    {id:'produk-2',kind:'product',status:'published',data:{title:'Sayuran segar pilihan',category:'Hasil kebun',description:'Contoh paket sayuran dengan isi yang dapat disesuaikan menurut ketersediaan. Hubungi penjual setelah kontak resmi dilengkapi.',price:18000,unit:'paket',seller:'Kebun Warga (contoh)',area:'Dusun II (contoh)',phone:'',image:'/images/vegetables.webp',imageCredit:'Foto ilustrasi · Midori / CC BY-SA 3.0',availability:'Tersedia',consent:true,featured:true}},
    {id:'produk-3',kind:'product',status:'published',data:{title:'Keranjang anyaman bambu',category:'Kerajinan',description:'Contoh kerajinan bambu untuk kebutuhan rumah tangga. Foto memperlihatkan proses anyaman sebagai ilustrasi, bukan foto produk penjual.',price:45000,unit:'buah',seller:'Rumah Anyam (contoh)',area:'Dusun III (contoh)',phone:'',image:'/images/basket.webp',imageCredit:'Foto ilustrasi · Abdulrohmatt / CC BY-SA 4.0',availability:'Pesan dahulu',consent:true,featured:true}},
    {id:'galeri-1',kind:'gallery',status:'published',data:{title:'Lanskap perdesaan',category:'Lingkungan',description:'Ilustrasi persawahan di Jawa; bukan dokumentasi Desa Marga Mulya.',image:'/images/hero.webp',imageCredit:'Thomas Fuhrmann · CC BY-SA 4.0',date:day(-8)}},
    {id:'galeri-2',kind:'gallery',status:'published',data:{title:'Keterampilan yang terus dirawat',category:'Kerajinan',description:'Ilustrasi penganyam bambu di Tasikmalaya; bukan dokumentasi Desa Marga Mulya.',image:'/images/basket.webp',imageCredit:'Abdulrohmatt · CC BY-SA 4.0',date:day(-6)}},
    {id:'galeri-3',kind:'gallery',status:'published',data:{title:'Hasil kebun untuk keseharian',category:'Potensi lokal',description:'Ilustrasi sayuran di Jakarta; bukan dokumentasi Desa Marga Mulya.',image:'/images/vegetables.webp',imageCredit:'Midori · CC BY-SA 3.0',date:day(-4)}},
    {id:'galeri-4',kind:'gallery',status:'published',data:{title:'Cerita dari ruang kerja pengrajin',category:'Kerajinan',description:'Ilustrasi anyaman bambu di Sidetapa; bukan dokumentasi Desa Marga Mulya.',image:'/images/weave.webp',imageCredit:'Dinata Juan · CC BY-SA 4.0',date:day(-3)}},
  ];
}

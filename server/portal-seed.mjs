// Initial Portal Desa data for demonstration. Coordinates and phone numbers are approximate and must be
// verified by the village government before real use. Unknown facts (tickets, hours, facilities) are left
// empty on purpose so the website shows "Informasi belum tersedia" instead of invented values.
// Places of worship are intentionally not seeded (competition rule: no SARA-related content).
export const approxNote='Lokasi perkiraan untuk demonstrasi; perlu diverifikasi pemerintah desa.';
const source=approxNote;
export const villageCenter={lat:-6.0353563,lng:106.5260001};
export const officeLocation={lat:-6.032823,lng:106.526683};

const tourism=[
  ['wisata-pasir-putih','Pantai Pasir Putih','pantai-pasir-putih','Desa Marga Mulya, Kecamatan Mauk, Kabupaten Tangerang, Banten',-6.028257,106.524324,'','Pantai di pesisir utara Desa Marga Mulya.'],
  ['wisata-karang-asem','Pantai KarangAsem','pantai-karangasem','Jl. Raya Tanjung Kait, Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten 15532',-6.016757,106.529577,'','Pantai di sekitar Jl. Raya Tanjung Kait, dikenal juga sebagai Pantai Karang Asem.'],
  ['wisata-hidden-gem','Pantai Hidden Gem','pantai-hidden-gem','Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten',-6.012579,106.532521,'','Pantai di ujung utara pesisir Marga Mulya.'],
  ['wisata-jk-park','Pantai Tanjung Kait JK Park','pantai-tanjung-kait-jk-park','Marga Mulya, Kecamatan Mauk, Kabupaten Tangerang, Banten',-6.014886,106.530316,'0856-7246-110','Kawasan pantai di sekitar Tanjung Kait.']
].map(([id,name,slug,address,latitude,longitude,phone,short],i)=>({table:'tourism_places',row:{id,name,slug,category:'Wisata pantai',short_description:short,
  description:name+' berada di pesisir Desa Marga Mulya, Kecamatan Mauk. Jam operasional, harga tiket, dan fasilitas belum tersedia dari sumber resmi. Hubungi pengelola untuk informasi terbaru.'+(phone?' Nomor kontak perlu dikonfirmasi ulang kepada pengelola.':''),
  address,latitude,longitude,cover_image:'',opening_hours:'',ticket_information:'',phone,facilities:'',is_active:1,sort_order:(i+1)*10}}));

const facilities=[
  ['fas-kantor-desa','Kantor Desa Marga Mulya','pemerintahan','Jl. Raya Tanjung Kait, Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten',-6.032823,106.526683,'0838-9370-5055','/images/kantor-desa-marga-mulya.jpg','Pusat pelayanan administrasi pemerintahan desa. Nomor telepon perlu dikonfirmasi ke pemerintah desa.'],
  ['fas-kecamatan','Kantor Kecamatan Mauk','pemerintahan','Mauk Timur, Kec. Mauk, Kabupaten Tangerang, Banten',-6.057595,106.512538,'','/images/kantor-kecamatan-mauk.jpg',''],
  ['fas-puskesmas','Puskesmas Mauk','kesehatan','Jl. Raya Rajeg Tanjakan No.2, Mauk Timur, Kec. Mauk, Kabupaten Tangerang, Banten',-6.061331,106.510453,'','',''],
  ['fas-klinik-melati','Klinik Melati BPJS Mauk','kesehatan','Jalan Raya Mauk Blok PK5, Mauk Timur, Kec. Mauk, Kabupaten Tangerang, Banten',-6.058043,106.513452,'0812-9524-5170','',''],
  ['fas-apotek-syarah','Apotek Syarah Farma','apotek','Jl. Raya Mauk, Kampung Pasar Sore, Banyu Asih, Kec. Mauk, Kabupaten Tangerang, Banten',-6.060137,106.527054,'','',''],
  ['fas-polsek','Polsek Mauk','polisi','Jl. Oto Iskandardinata No.2, Mauk Timur, Kec. Mauk, Kabupaten Tangerang, Banten',-6.057769,106.514102,'(021) 59330110','',''],
  ['fas-damkar','Pos Pemadam Kebakaran Mauk','pemadam','Ketapang, Kec. Mauk, Kabupaten Tangerang, Banten',-6.054856,106.511524,'(021) 5984343','',''],
  ['fas-sdn','SDN Margamulya','sekolah','Jl. Kp. Jl. Edison, Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten',-6.040389,106.523697,'','',''],
  ['fas-paud','KB PAUD Al Fikri Margamulya','sekolah','Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten',-6.035226,106.526775,'','',''],
  ['fas-atm-mandiri','ATM Mandiri','atm','Jl. Raya Tanjung Kait, Marga Mulya, Kec. Mauk, Kabupaten Tangerang, Banten',-6.029698,106.532018,'','',''],
  ['fas-pasar-mauk','Pasar Mauk','lainnya','Mauk Timur, Kec. Mauk, Kabupaten Tangerang, Banten',-6.061234,106.511558,'','',''],
  ['fas-spbu','SPBU Pertamina 34.155.03','spbu','Jl. Raya Mauk Km 17, Kedung Dalem, Kec. Mauk, Kabupaten Tangerang, Banten',-6.075510,106.538380,'(021) 59330508','','SPBU terdekat di jalur Jl. Raya Mauk.']
].map(([id,name,category,address,latitude,longitude,phone,image_url,description])=>({table:'public_facilities',row:{id,name,category,description:description||source,address,latitude,longitude,phone,opening_hours:'',image_url,is_active:1}}));

const emergency=[
  ['em-112','Layanan Darurat Terintegrasi','112','darurat','nasional','Satu nomor untuk berbagai keadaan darurat. Bebas pulsa.',1],
  ['em-110','Polisi','110','polisi','nasional','Laporan kejahatan dan gangguan keamanan.',2],
  ['em-119','Darurat Medis / Ambulans','119','medis','nasional','Layanan kegawatdaruratan medis.',3],
  ['em-113','Pemadam Kebakaran','113','pemadam','nasional','Kebakaran dan penyelamatan.',4],
  ['em-polsek','Polsek Mauk','(021) 59330110','polisi','lokal','Jl. Oto Iskandardinata No.2, Mauk Timur. Nomor perlu dikonfirmasi ulang.',10],
  ['em-damkar','Pos Pemadam Kebakaran Mauk','(021) 5984343','pemadam','lokal','Ketapang, Kec. Mauk. Nomor perlu dikonfirmasi ulang.',11],
  ['em-puskesmas','Puskesmas Mauk','','medis','lokal','Nomor belum terverifikasi. Lengkapi lalu aktifkan dari panel admin.',12],
  ['em-kantor-desa','Kantor Desa Marga Mulya','0838-9370-5055','desa','lokal','Pada jam pelayanan. Nomor perlu dikonfirmasi ke pemerintah desa.',13]
].map(([id,name,phone,category,scope,description,priority])=>({table:'emergency_contacts',row:{id,name,phone,category,scope,description,priority,is_active:phone?1:0}}));

const faqs=[
  ['Bagaimana mengurus surat domisili?','Datang ke Kantor Desa Marga Mulya pada jam pelayanan dengan membawa KTP dan Kartu Keluarga. Umumnya diperlukan surat pengantar dari RT/RW. Persyaratan dapat berubah, jadi tanyakan petugas atau kirim pesan melalui Tanya Desa sebelum datang.','Administrasi'],
  ['Bagaimana membuat surat pengantar?','Mulai dari Ketua RT dan RW tempat tinggal Anda. Bawa surat pengantar RT/RW beserta KTP dan KK ke Kantor Desa, lalu sampaikan keperluan surat kepada petugas pelayanan.','Administrasi'],
  ['Bagaimana melaporkan jalan rusak?','Pilih “Buat Pengaduan”, pilih kategori Jalan Rusak, tuliskan lokasi kejadian, dan unggah foto bila ada. Simpan nomor tiket (misalnya TIK-001) untuk mengecek perkembangan laporan.','Pengaduan'],
  ['Bagaimana cara mengetahui bantuan sosial?','Buka halaman Bantuan Desa untuk melihat program yang diumumkan desa. Nama penerima ditampilkan tersamar. Untuk memastikan status Anda, datang ke Kantor Desa dengan membawa KTP. Data pribadi tidak diperiksa melalui website.','Bantuan sosial'],
  ['Bagaimana menghubungi perangkat desa?','Gunakan halaman Kontak, kirim pesan melalui Tanya Desa, atau datang ke Kantor Desa pada jam pelayanan.','Umum'],
  ['Bagaimana mengecek pengaduan?','Buka “Cek Pengaduan” lalu masukkan nomor tiket, misalnya TIK-023. Status pengaduan: Baru, Diverifikasi, Diproses, Selesai, atau Ditolak, beserta catatan dari petugas.','Pengaduan']
].map(([question,answer,category],i)=>({table:'faqs',row:{id:'faq-'+(i+1),question,answer,category,sort_order:(i+1)*10,is_active:1}}));

const node=(id,title,message,action_type,sort_order,parent_id=null)=>({table:'chatbot_nodes',row:{id,title,message,parent_id,action_type,sort_order,is_active:1}});
const opt=(node_id,n,label,action,target_node_id=null,action_value='')=>({table:'chatbot_options',row:{id:node_id+'-'+n,node_id,option_number:n,label,action,target_node_id,action_value,sort_order:n*10}});
const chatbot=[
  node('bot-root','Menu utama','Halo 👋\nSelamat datang di Asisten Desa Marga Mulya.\n\nSilakan pilih layanan:','start',0),
  node('bot-complaint','Pengaduan warga','Silakan pilih jenis masalah:','menu',10,'bot-root'),
  node('bot-services','Pelayanan desa','Informasi pelayanan administrasi desa. Pilih topik:','menu',20,'bot-root'),
  node('bot-domisili','Surat domisili','Surat domisili diurus di Kantor Desa pada jam pelayanan. Bawa KTP, Kartu Keluarga, dan surat pengantar RT/RW. Persyaratan dapat berubah; tanyakan petugas bila ragu.','answer',21,'bot-services'),
  node('bot-pengantar','Surat pengantar','Surat pengantar dimulai dari Ketua RT dan RW. Setelah itu bawa ke Kantor Desa bersama KTP dan KK.','answer',22,'bot-services'),
  node('bot-jam','Jam & lokasi pelayanan','Kantor Desa Marga Mulya berada di Jl. Raya Tanjung Kait, Kecamatan Mauk. Jam pelayanan dapat dilihat pada halaman Kontak.','answer',23,'bot-services'),
  node('bot-aid','Bantuan sosial','Informasi bantuan sosial. Pilih yang Anda perlukan:','menu',30,'bot-root'),
  node('bot-aid-status','Status penerima','Status penerima bantuan dipastikan langsung di Kantor Desa dengan membawa KTP. Website hanya menampilkan nama tersamar untuk program yang diizinkan.','answer',31,'bot-aid'),
  node('bot-tourism','Wisata','Desa Marga Mulya memiliki beberapa pantai di pesisir Tanjung Kait. Pilih informasi:','menu',40,'bot-root'),
  node('bot-handover','Hubungi admin','Pertanyaan Anda belum dapat dijawab otomatis.\n\nApakah Anda ingin terhubung dengan Admin Desa?','handover',90,'bot-root')
];
const options=[
  opt('bot-root',1,'Pengaduan Warga','goto','bot-complaint'),opt('bot-root',2,'Cek Status Pengaduan','track'),
  opt('bot-root',3,'Informasi Pelayanan Desa','goto','bot-services'),opt('bot-root',4,'Bantuan Sosial','goto','bot-aid'),
  opt('bot-root',5,'FAQ','faq'),opt('bot-root',6,'Informasi Wisata','goto','bot-tourism'),opt('bot-root',7,'Hubungi Admin','goto','bot-handover'),
  opt('bot-complaint',1,'Jalan / Infrastruktur','complaint',null,'Jalan Rusak'),opt('bot-complaint',2,'Sampah','complaint',null,'Sampah'),
  opt('bot-complaint',3,'Lampu Jalan','complaint',null,'Lampu Jalan'),opt('bot-complaint',4,'Drainase','complaint',null,'Drainase'),
  opt('bot-complaint',5,'Keamanan','complaint',null,'Keamanan'),opt('bot-complaint',6,'Bantuan Sosial','complaint',null,'Bantuan Sosial'),
  opt('bot-complaint',7,'Lainnya','goto','bot-handover'),
  opt('bot-services',1,'Surat domisili','goto','bot-domisili'),opt('bot-services',2,'Surat pengantar','goto','bot-pengantar'),
  opt('bot-services',3,'Jam & lokasi pelayanan','goto','bot-jam'),opt('bot-services',4,'Pertanyaan lain','goto','bot-handover'),
  opt('bot-aid',1,'Lihat program bantuan desa','link',null,'/transparansi?tab=bantuan'),opt('bot-aid',2,'Cara mengetahui status penerima','goto','bot-aid-status'),
  opt('bot-aid',3,'Laporkan masalah bantuan','complaint',null,'Bantuan Sosial'),opt('bot-aid',4,'Hubungi admin','goto','bot-handover'),
  opt('bot-tourism',1,'Daftar wisata desa','link',null,'/wisata'),opt('bot-tourism',2,'Peta wisata & fasilitas','link',null,'/peta-desa')
];

// Area names follow the example structure; RT/RW units are not seeded because the official division is unverified.
const areas=['Dusun I','Dusun II','Dusun III','Dusun IV'].map((name,i)=>({table:'village_areas',row:{id:'dusun-'+(i+1),name,sort_order:(i+1)*10,is_active:1}}));

const year=new Date().getFullYear();
const examples=[
  {table:'development_projects',row:{id:'proyek-contoh-1',title:'Perbaikan saluran drainase (contoh)',description:'Contoh pengisian proyek pembangunan untuk demonstrasi. Nama kegiatan, anggaran, dan progres bukan data resmi desa.',location:'Lingkungan permukiman (contoh)',village_area_id:'dusun-2',rt:'',rw:'',year,funding_source:'Dana Desa',budget:0,contractor:'Tim Pelaksana Kegiatan (contoh)',start_date:'',target_date:'',progress:60,status:'Berjalan',cover_image:'',is_published:1,sort_order:10}},
  {table:'development_projects',row:{id:'proyek-contoh-2',title:'Penerangan jalan lingkungan (contoh)',description:'Contoh proyek yang direncanakan. Ganti dengan data kegiatan resmi melalui panel admin.',location:'Jalan lingkungan (contoh)',village_area_id:'dusun-1',rt:'',rw:'',year,funding_source:'Dana Desa',budget:0,contractor:'',start_date:'',target_date:'',progress:0,status:'Direncanakan',cover_image:'',is_published:1,sort_order:20}},
  {table:'project_updates',row:{id:'update-contoh-1',project_id:'proyek-contoh-1',date:new Date().toISOString().slice(0,10),title:'Pengecekan lokasi (contoh)',note:'Contoh catatan progres. Admin dapat menambahkan foto sebelum, proses, dan selesai.',progress:60,phase:'proses',image_url:'',sort_order:10}},
  {table:'aid_programs',row:{id:'bantuan-contoh-1',name:'BLT Desa (contoh)',year,funding_source:'Dana Desa',recipient_count:0,status:'Persiapan',description:'Contoh program bantuan untuk demonstrasi alur transparansi. Jumlah dan daftar penerima diisi pemerintah desa.',show_recipients:1,cover_image:'',is_published:1,sort_order:10}},
  {table:'aid_recipients',row:{id:'penerima-contoh-1',program_id:'bantuan-contoh-1',name:'Warga Contoh Satu',village_area_id:'dusun-1',status:'Sudah disalurkan',is_active:1}},
  {table:'aid_recipients',row:{id:'penerima-contoh-2',program_id:'bantuan-contoh-1',name:'Warga Contoh Dua',village_area_id:'dusun-2',status:'Belum disalurkan',is_active:1}}
];

export function portalSeed(){return [...areas,...tourism,...facilities,...emergency,...faqs,...chatbot,...options,...examples];}

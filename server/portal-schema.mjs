// Portal Digital Desa — table definitions shared by the migration, server-side validation,
// the generic admin CRUD API and the admin forms. Pure module: safe to import from the browser.
export const SCHEMA_VERSION='portal-v5-tourism-submissions';

export const facilityCategories=[
  ['wisata','Wisata','🏖'],['penginapan','Penginapan warga','🏡'],['pemandu','Titik temu pemandu','🧭'],['kesehatan','Kesehatan','🏥'],['apotek','Apotek','💊'],['polisi','Polisi','🚓'],
  ['pemadam','Pemadam kebakaran','🚒'],['sekolah','Sekolah','🏫'],['olahraga','Lapangan & olahraga','⚽'],['taman','Taman, danau & ruang terbuka','🌳'],
  ['pemerintahan','Pemerintahan','🏛'],['atm','ATM','🏧'],['spbu','SPBU','⛽'],['lainnya','Fasilitas lainnya','🛒']
];
// Filter groups shown above the map; each group lists the categories it contains.
export const mapFilters=[
  ['semua','Semua',[]],['wisata','Wisata',['wisata']],['penginapan','Penginapan',['penginapan']],['pemandu','Pemandu',['pemandu']],['kesehatan','Kesehatan',['kesehatan','apotek']],
  ['pendidikan','Pendidikan',['sekolah']],['pemerintahan','Pemerintahan',['pemerintahan']],
  ['keamanan','Keamanan',['polisi','pemadam']],['olahraga','Olahraga & taman',['olahraga','taman']],['atm','ATM',['atm']],['lainnya','Lainnya',['spbu','lainnya']]
];
export const complaintCategories=['Infrastruktur','Jalan Rusak','Sampah','Sampah Pantai','Drainase','Banjir / Rob','Lampu Jalan','Pelayanan Desa','Keamanan','Bantuan Sosial','Lingkungan','Lainnya'];
export const complaintStatuses=[['baru','BARU'],['diverifikasi','DIVERIFIKASI'],['diproses','DIPROSES'],['selesai','SELESAI'],['ditolak','DITOLAK']];
export const chatCategories=['Administrasi surat','Bantuan sosial','Pengaduan','Wisata','Informasi umum','Lainnya'];
export const botActions=[
  ['goto','Buka menu / jawaban lain'],['handover','Hubungkan ke admin'],['complaint','Buka formulir pengaduan'],
  ['track','Cek status pengaduan'],['faq','Tampilkan daftar FAQ'],['link','Buka halaman website'],
  ['emergency','Tampilkan nomor darurat'],['root','Kembali ke menu utama']
];
export const ticketLabel=n=>'TIK-'+String(n).padStart(3,'0');

const text=(label,max=200,o={})=>({type:'text',label,max,...o});
const long=(label,max=4000,o={})=>({type:'text',label,max,long:true,...o});
const int=(label,min,max,o={})=>({type:'int',label,min,max,...o});
const num=(label,min,max,o={})=>({type:'num',label,min,max,...o});
const bool=(label,def=true,o={})=>({type:'bool',label,def,...o});
const choice=(label,options,o={})=>({type:'enum',label,options,...o});
const image=(label='Foto',o={})=>({type:'image',label,...o});
// Source/quality label shown next to public data so demo, estimated and official data are never confused.
export const dataStatuses=[['perlu_verifikasi','Perlu verifikasi'],['terverifikasi','Terverifikasi desa'],['sumber_pemerintah','Sumber pemerintah'],['demo','Data contoh']];
const dataStatus=()=>choice('Status data',dataStatuses,{def:'perlu_verifikasi',help:'Tampil sebagai label di website. Pilih “Terverifikasi desa” hanya setelah dicek pemerintah desa.'});
const ref=(label,table,o={})=>({type:'ref',label,table,...o});
const phone=(label='Nomor telepon',o={})=>({type:'phone',label,...o});
const date=(label,o={})=>({type:'date',label,...o});
const rtPattern={pattern:/^\d{1,3}$/,patternMessage:'RT/RW berupa angka 1–3 digit, misalnya 003.'};

const directoryFields=()=>({
  name:text('Nama layanan / usaha',150,{required:true,min:3}),
  slug:{type:'slug',from:'name',label:'Slug'},
  short_description:text('Ringkasan',300,{required:true}),
  description:long('Deskripsi lengkap',6000),
  area:text('Wilayah layanan / lokasi umum',200,{required:true,help:'Cukup dusun atau kawasan; alamat rumah lengkap dapat diberikan saat konfirmasi.'}),
  owner_name:text('Nama pemilik / pemandu',120,{help:'Tampil di halaman detail.'}),
  address:text('Alamat lengkap (khusus pengelola, tidak tampil di website)',300),
  submission_status:choice('Status pengajuan',[['admin','Dibuat pengelola'],['pending','Pengajuan baru — perlu diperiksa'],['approved','Pengajuan disetujui'],['rejected','Pengajuan ditolak']]),
  cover_image:image('Foto layanan'),
  image_credit:text('Sumber foto / izin pemilik',300),
  phone:phone('WhatsApp penyedia'),
  contact_consent:bool('Penyedia mengizinkan publikasi layanan dan kontak',false),
  latitude:num('Latitude titik yang disetujui',-90,90,{step:'any'}),
  longitude:num('Longitude titik yang disetujui',-180,180,{step:'any'}),
  location_consent:bool('Penyedia mengizinkan titik ini ditampilkan di peta',false,{help:'Untuk pemandu, gunakan titik temu umum. Tanpa izin, koordinat tidak dikirim ke pengunjung.'}),
  price:num('Tarif mulai (Rp)',0,100000000,{help:'Kosongkan jika harus ditanyakan. Angka 0 berarti gratis.'}),
  availability:choice('Status layanan',[['inquiry','Konfirmasi ketersediaan'],['paused','Sementara tidak menerima tamu']]),
  terms:long('Ketentuan & cara konfirmasi',2000),
  data_status:dataStatus(),
  verified_on:date('Tanggal pemeriksaan oleh desa'),
  is_active:bool('Terbitkan layanan',false),
  sort_order:int('Urutan tampil',0,9999,{def:100})
});
function checkDirectory(r){
  if((r.latitude===null)!==(r.longitude===null))return 'Isi latitude dan longitude berpasangan, atau kosongkan keduanya.';
  if(r.location_consent&&r.latitude===null)return 'Isi titik peta sebelum memberikan izin lokasi.';
  if(r.phone){const n=r.phone.replace(/[\s().-]/g,'');if(!/^(?:\+62|62|0)8\d{7,11}$/.test(n))return 'Isi nomor WhatsApp Indonesia yang valid.';r.phone=n.replace(/^\+/,'').replace(/^0/,'62');}
  if(r.cover_image&&!r.image_credit)return 'Isi sumber foto atau keterangan izin pemilik.';
  if(r.data_status==='terverifikasi'&&!r.verified_on)return 'Isi tanggal pemeriksaan sebelum memberi status Terverifikasi desa.';
  if(r.verified_on&&r.verified_on>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date()))return 'Tanggal pemeriksaan tidak boleh di masa depan.';
  if(r.is_active&&r.data_status!=='demo'&&(!r.owner_name||!r.address))return 'Sebelum terbit, isi nama pemilik dan alamat lengkap.';
  if(r.is_active&&r.submission_status==='rejected')return 'Pengajuan yang ditolak tidak dapat diterbitkan.';
  if(r.is_active&&r.submission_status==='pending')r.submission_status='approved';
  if(r.is_active&&r.data_status!=='demo'&&(!r.contact_consent||!r.phone))return 'Sebelum terbit, minta izin penyedia dan isi nomor WhatsApp. Untuk demonstrasi, pilih Data contoh.';
}

export const tables={
  tourism_stays:{title:'Penginapan warga',item:'penginapan',publicFlag:'is_active',order:'sort_order, name',fields:{
    ...directoryFields(),
    stay_type:choice('Jenis penginapan',['Rumah sewa','Homestay','Kamar tamu','Villa']),
    capacity:int('Kapasitas tamu',1,100,{def:2}),
    bedrooms:int('Kamar tidur',0,50,{def:1}),
    amenities:long('Fasilitas — satu per baris',2000),
    check_in:text('Jam masuk',80),check_out:text('Jam keluar',80),
    accessibility:long('Akses & kebutuhan khusus',1000,{help:'Jelaskan kondisi nyata, misalnya akses tangga atau toilet. Hindari klaim yang belum diperiksa.'})
  },check:checkDirectory},
  tourism_guides:{title:'Pemandu lokal',item:'pemandu',publicFlag:'is_active',order:'sort_order, name',fields:{
    ...directoryFields(),
    languages:text('Bahasa layanan (pisahkan koma)',200,{def:'Bahasa Indonesia'}),
    specialties:long('Kegiatan / keahlian — satu per baris',2000),
    capacity:int('Maksimal peserta per kelompok',1,100,{def:6}),
    duration_hours:num('Durasi layanan (jam)',0.5,72,{step:0.5}),
    rate_unit:choice('Satuan tarif',['per kelompok','per orang']),
    inclusions:long('Termasuk dalam tarif — satu per baris',2000),
    exclusions:long('Belum termasuk — satu per baris',2000)
  },check:checkDirectory},
  tourism_places:{title:'Wisata',item:'destinasi wisata',publicFlag:'is_active',order:'sort_order, name',
    fields:{
      name:text('Nama wisata',150,{required:true,min:3}),
      slug:{type:'slug',from:'name',label:'Slug'},
      category:text('Kategori',80,{def:'Wisata pantai',help:'Contoh: Wisata pantai, Wisata religi, Kuliner.'}),
      short_description:text('Deskripsi pendek',300,{help:'Tampil pada kartu wisata.'}),
      description:long('Deskripsi lengkap',6000),
      address:text('Alamat',300,{required:true}),
      latitude:num('Latitude',-90,90,{required:true,step:'any',help:'Contoh: -6.028257'}),
      longitude:num('Longitude',-180,180,{required:true,step:'any',help:'Contoh: 106.524324'}),
      cover_image:image('Foto sampul'),
      opening_hours:text('Jam operasional',300,{help:'Kosongkan jika belum ada sumber resmi.'}),
      ticket_information:text('Harga tiket',500,{help:'Kosongkan jika belum ada sumber resmi.'}),
      phone:phone('Kontak pengelola'),
      facilities:long('Fasilitas — satu per baris',2000),
      data_status:dataStatus(),
      is_active:bool('Tampilkan destinasi'),
      sort_order:int('Urutan tampil',0,9999,{def:100})
    },
    children:[{table:'tourism_gallery',key:'tourism_id',title:'Galeri foto'}]},
  tourism_gallery:{title:'Galeri wisata',item:'foto',parent:{table:'tourism_places',key:'tourism_id'},order:'sort_order, created_at',
    fields:{tourism_id:ref('Destinasi','tourism_places',{required:true}),image_url:image('Foto',{required:true}),caption:text('Keterangan foto',300),sort_order:int('Urutan',0,9999,{def:100})}},

  public_facilities:{title:'Fasilitas umum',item:'fasilitas',publicFlag:'is_active',order:'category, name',
    fields:{
      name:text('Nama fasilitas',150,{required:true,min:3}),
      category:choice('Kategori',facilityCategories.filter(c=>!['wisata','penginapan','pemandu'].includes(c[0])).map(([v,l,e])=>[v,e+' '+l])),
      description:long('Keterangan',2000),
      address:text('Alamat',300,{required:true}),
      latitude:num('Latitude',-90,90,{required:true,step:'any'}),
      longitude:num('Longitude',-180,180,{required:true,step:'any'}),
      phone:phone(),
      opening_hours:text('Jam operasional',300),
      image_url:image('Foto'),
      data_status:dataStatus(),
      is_active:bool('Tampilkan marker di peta')
    }},

  faqs:{title:'FAQ',item:'pertanyaan',publicFlag:'is_active',order:'sort_order, question',
    fields:{question:text('Pertanyaan',300,{required:true,min:5}),answer:long('Jawaban',4000,{required:true}),category:text('Kategori',80,{def:'Umum'}),sort_order:int('Urutan tampil',0,9999,{def:100}),is_active:bool('Tampilkan FAQ')}},

  chatbot_nodes:{title:'Chatbot',item:'menu chatbot',publicFlag:'is_active',order:'sort_order, title',
    fields:{
      title:text('Judul menu (untuk admin)',120,{required:true}),
      message:long('Pesan yang dikirim bot',2000,{required:true}),
      parent_id:ref('Menu induk (opsional)','chatbot_nodes',{help:'Hanya untuk pengelompokan di admin.'}),
      action_type:choice('Jenis menu',[['menu','Menu pilihan'],['answer','Jawaban'],['handover','Tawarkan hubungi admin'],['start','Menu utama (awal percakapan)']]),
      sort_order:int('Urutan',0,9999,{def:100}),
      is_active:bool('Aktifkan menu')
    },
    children:[{table:'chatbot_options',key:'node_id',title:'Pilihan balasan (quick reply)'}]},
  chatbot_options:{title:'Pilihan chatbot',item:'pilihan',parent:{table:'chatbot_nodes',key:'node_id'},order:'option_number, sort_order',
    fields:{
      node_id:ref('Menu','chatbot_nodes',{required:true}),
      option_number:int('Nomor pilihan',0,99,{def:1}),
      label:text('Teks pilihan',120,{required:true}),
      action:choice('Tindakan',botActions),
      target_node_id:ref('Tujuan menu','chatbot_nodes',{showIf:r=>r.action==='goto'}),
      action_value:text('Nilai tindakan',200,{showIf:r=>['complaint','link'].includes(r.action),help:'Pengaduan: nama kategori (mis. Sampah). Halaman: alamat internal (mis. /wisata).'}),
      sort_order:int('Urutan',0,9999,{def:100})
    },
    check(r){
      if(r.action==='goto'&&!r.target_node_id)return 'Pilih tujuan menu untuk tindakan “Buka menu / jawaban lain”.';
      if(r.action==='link'&&!/^\/[a-z0-9\-/?=&]*$/i.test(r.action_value))return 'Alamat halaman harus berupa alamat internal, misalnya /wisata.';
      if(r.action==='complaint'&&r.action_value&&!complaintCategories.includes(r.action_value))return 'Kategori pengaduan tidak dikenal: '+complaintCategories.join(', ')+'.';
    }},

  emergency_contacts:{title:'Nomor darurat',item:'nomor penting',publicFlag:'is_active',order:'priority, name',
    fields:{
      name:text('Nama layanan',120,{required:true}),
      phone:phone('Nomor telepon'),
      category:choice('Jenis layanan',[['darurat','Darurat terpadu'],['polisi','Polisi'],['medis','Medis / ambulans'],['pemadam','Pemadam kebakaran'],['desa','Pemerintah desa'],['lainnya','Lainnya']]),
      scope:choice('Cakupan',[['nasional','Nomor nasional'],['lokal','Kontak lokal']]),
      description:text('Keterangan',300),
      priority:int('Prioritas (angka kecil tampil lebih dulu)',0,999,{def:50}),
      data_status:dataStatus(),
      is_active:bool('Tampilkan ke publik')
    },
    check(r){if(r.is_active&&!r.phone)return 'Nomor telepon wajib diisi sebelum kontak ditampilkan.';}},

  village_areas:{title:'Wilayah / Dusun',item:'dusun / wilayah',publicFlag:'is_active',order:'sort_order, name',
    fields:{name:text('Nama dusun / wilayah',80,{required:true,min:2}),sort_order:int('Urutan',0,9999,{def:100}),is_active:bool('Aktif di formulir warga')},
    children:[{table:'neighborhood_units',key:'village_area_id',title:'RT / RW di wilayah ini'}]},
  neighborhood_units:{title:'RT/RW',item:'RT/RW',parent:{table:'village_areas',key:'village_area_id'},publicFlag:'is_active',order:'rw, rt',
    fields:{village_area_id:ref('Dusun','village_areas',{required:true}),rt:text('RT',3,{required:true,...rtPattern}),rw:text('RW',3,{required:true,...rtPattern}),is_active:bool('Aktif')},
    normalize(r){r.rt=r.rt.padStart(3,'0');r.rw=r.rw.padStart(3,'0');}},

  development_projects:{title:'Pembangunan',item:'proyek pembangunan',publicFlag:'is_published',order:'sort_order, year DESC, title',
    fields:{
      title:text('Nama kegiatan',200,{required:true,min:3}),
      description:long('Keterangan',6000),
      location:text('Lokasi',300,{required:true}),
      village_area_id:ref('Dusun','village_areas'),
      rt:text('RT',3,rtPattern),rw:text('RW',3,rtPattern),
      year:int('Tahun',2000,2100,{def:new Date().getFullYear()}),
      funding_source:text('Sumber dana',120,{def:'Dana Desa'}),
      budget:{type:'bigint',label:'Anggaran (Rp)',min:0,max:1e13},
      contractor:text('Pelaksana',200),
      start_date:date('Tanggal mulai'),target_date:date('Target selesai'),
      progress:int('Progres (%)',0,100),
      status:choice('Status',['Direncanakan','Berjalan','Selesai','Ditunda']),
      cover_image:image('Foto utama'),
      data_status:dataStatus(),
      is_published:bool('Terbitkan'),
      sort_order:int('Urutan',0,9999,{def:100})
    },
    check(r){if(r.start_date&&r.target_date&&r.target_date<r.start_date)return 'Target selesai tidak boleh sebelum tanggal mulai.';if(r.status==='Selesai'&&r.progress<100)r.progress=100;},
    children:[{table:'project_updates',key:'project_id',title:'Dokumentasi & timeline progres'}]},
  project_updates:{title:'Dokumentasi pembangunan',item:'catatan progres',parent:{table:'development_projects',key:'project_id'},order:'date, sort_order, created_at',
    fields:{
      project_id:ref('Proyek','development_projects',{required:true}),
      date:date('Tanggal',{required:true}),
      title:text('Judul catatan',200,{required:true}),
      note:long('Keterangan',2000),
      progress:int('Progres saat itu (%)',0,100),
      phase:choice('Tahap foto',[['proses','Foto proses'],['sebelum','Foto sebelum'],['selesai','Foto selesai'],['','Tanpa tahap']]),
      image_url:image('Foto dokumentasi'),
      sort_order:int('Urutan',0,9999,{def:100})
    }},

  aid_programs:{title:'Program bantuan',item:'program bantuan',publicFlag:'is_published',order:'sort_order, year DESC, name',
    fields:{
      name:text('Nama program',200,{required:true,min:3}),
      year:int('Tahun',2000,2100,{def:new Date().getFullYear()}),
      funding_source:text('Sumber dana',120),
      recipient_count:int('Jumlah penerima',0,1000000),
      status:choice('Status',['Persiapan','Penyaluran','Selesai','Ditunda']),
      description:long('Keterangan',6000),
      show_recipients:bool('Tampilkan daftar penerima (nama disamarkan)',false,{help:'Aktifkan hanya jika pemerintah desa mengizinkan publikasi.'}),
      cover_image:image('Foto program'),
      data_status:dataStatus(),
      is_published:bool('Terbitkan'),
      sort_order:int('Urutan',0,9999,{def:100})
    },
    children:[{table:'aid_documentation',key:'program_id',title:'Dokumentasi penyaluran'}]},
  aid_recipients:{title:'Penerima bantuan',item:'penerima',parent:{table:'aid_programs',key:'program_id'},order:'name',privateRows:true,
    fields:{
      program_id:ref('Program','aid_programs',{required:true}),
      name:text('Nama penerima',120,{required:true,min:2,help:'Jangan memasukkan NIK, nomor KK, nomor HP, atau alamat rumah.'}),
      village_area_id:ref('Dusun','village_areas'),
      status:choice('Status penyaluran',['Belum disalurkan','Sudah disalurkan','Ditunda']),
      is_active:bool('Aktif')
    },
    check(r){if(/\d{8,}/.test(r.name))return 'Nama tidak boleh memuat nomor identitas.';}},
  aid_documentation:{title:'Dokumentasi bantuan',item:'foto dokumentasi',parent:{table:'aid_programs',key:'program_id'},order:'date, sort_order, created_at',
    fields:{program_id:ref('Program','aid_programs',{required:true}),image_url:image('Foto',{required:true}),caption:text('Keterangan',300),stage:text('Tahap',120,{help:'Contoh: Penyaluran Tahap I'}),date:date('Tanggal'),sort_order:int('Urutan',0,9999,{def:100})}}
};

function columnSql(name,f){
  switch(f.type){
    case 'int':return `${name} INTEGER NOT NULL DEFAULT 0`;
    case 'bigint':return `${name} BIGINT NOT NULL DEFAULT 0`;
    case 'num':return `${name} DOUBLE PRECISION${f.required?' NOT NULL':''}`;
    case 'bool':return `${name} INTEGER NOT NULL DEFAULT ${f.def===false?0:1}`;
    case 'enum':{const d=f.def??(Array.isArray(f.options[0])?f.options[0][0]:f.options[0]);return `${name} TEXT NOT NULL DEFAULT '${String(d).replace(/'/g,"''")}'`;}
    case 'ref':return `${name} TEXT${f.required?' NOT NULL':''} REFERENCES ${f.table}(id) ON DELETE ${f.required?'CASCADE':'SET NULL'}`;
    default:return `${name} TEXT NOT NULL DEFAULT ''`;
  }
}
// Every image field may hold up to MAX_IMAGES photos: the first in the column itself, the rest as a JSON list in <field>_more.
export const MAX_IMAGES=3;
// Homepage blocks the admin can show/hide and reorder (the hero slideshow is always first).
export const homeSectionKeys=['quick','news','market','profile','weather','tourism','projects','stats','gallery','latest','map','contact'];
// Default order before design revision 3 (used to migrate untouched homepage settings only).
export const legacyHomeOrder=['quick','news','profile','weather','market','tourism','projects','stats','gallery','latest','map','contact'];
export const homeSectionLabels={quick:'Akses cepat layanan',news:'Pengumuman & agenda terdekat',profile:'Profil singkat desa',weather:'Cuaca',market:'Lapak desa (produk UMKM warga)',tourism:'Wisata desa',projects:'Pembangunan terbaru',stats:'Data desa singkat',gallery:'Galeri desa (slide)',latest:'Berita terbaru',map:'Peta desa',contact:'Kontak'};
// Columns added after the first release. Applied with ALTER TABLE ... ADD COLUMN (additive, never destructive).
export const extraImageColumns=()=>[
  ...Object.entries(tables).flatMap(([table,def])=>Object.entries(def.fields).filter(([,f])=>f.type==='image').map(([k])=>[table,k+'_more',"TEXT NOT NULL DEFAULT '[]'"])),
  ['complaints','image_more',"TEXT NOT NULL DEFAULT '[]'"],
  ...['tourism_stays','tourism_guides'].flatMap(t=>[[t,'owner_name',"TEXT NOT NULL DEFAULT ''"],[t,'address',"TEXT NOT NULL DEFAULT ''"],[t,'submission_status',"TEXT NOT NULL DEFAULT 'admin'"]]),
  ...Object.entries(tables).flatMap(([table,def])=>def.fields.data_status?[[table,'data_status',columnSql('data_status',def.fields.data_status).replace(/^data_status /,'')]]:[]),
  ['complaints','pin_hash',"TEXT NOT NULL DEFAULT ''"],
  ['complaints','feedback_rating','INTEGER NOT NULL DEFAULT 0'],
  ['complaints','feedback_note',"TEXT NOT NULL DEFAULT ''"],
  ['complaints','feedback_at',"TEXT NOT NULL DEFAULT ''"]
];
// Idempotent DDL (CREATE ... IF NOT EXISTS) valid for both SQLite and PostgreSQL. Parents come before children.
export function portalDDL(){
  const out=[];
  for(const [name,def] of Object.entries(tables)){
    const cols=Object.entries(def.fields).map(([k,f])=>columnSql(k,f));
    out.push(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, ${cols.join(', ')}, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    if(def.parent)out.push(`CREATE INDEX IF NOT EXISTS ${name}_parent ON ${name}(${def.parent.key})`);
  }
  out.push(
    'CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL)',
    "INSERT INTO counters(name,value) VALUES('complaint',0) ON CONFLICT(name) DO NOTHING",
    'CREATE TABLE IF NOT EXISTS complaints (id TEXT PRIMARY KEY, ticket_no INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT NOT NULL, village_area_id TEXT REFERENCES village_areas(id) ON DELETE SET NULL, area_name TEXT NOT NULL, rt TEXT NOT NULL, rw TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, location TEXT NOT NULL, image TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS complaints_status ON complaints(status)',
    'CREATE TABLE IF NOT EXISTS complaint_updates (id TEXT PRIMARY KEY, complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE, status TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS complaint_updates_parent ON complaint_updates(complaint_id)',
    'CREATE TABLE IF NOT EXISTS chat_conversations (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL, admin_read_at TEXT NOT NULL, citizen_read_at TEXT NOT NULL, last_message_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, sender TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS chat_messages_parent ON chat_messages(conversation_id, created_at)'
  );
  return out;
}

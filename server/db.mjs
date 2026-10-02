import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {seedRecords,siteSeed} from './seed.mjs';
import {portalDDL,SCHEMA_VERSION,extraImageColumns,homeSectionKeys,legacyHomeOrder} from './portal-schema.mjs';
import {portalSeed,approxNote,officialSchools,emergency112} from './portal-seed.mjs';
import {directorySeed} from './directory-seed.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let queryFn; let transactionFn; let ready; let closeFn=()=>{};
// Releases the local SQLite file handle (used by tests so the temp folder can be deleted on Windows).
export function close(){closeFn();closeFn=()=>{};ready=null;}
export async function query(text,args=[]){await init();return queryFn(text,args);}
export async function transaction(statements){await init();return transactionFn(statements);}
export const hash=t=>createHash('sha256').update(t).digest('hex');
export function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
export function verifyPassword(p,stored){try{const [s,h]=stored.split(':');const b=Buffer.from(h,'hex');const test=scryptSync(p,s,64);return b.length===test.length&&timingSafeEqual(b,test);}catch{return false;}}
export async function init(){
  if(ready)return ready;
  ready=(async()=>{
    if(process.env.DATABASE_URL){
      const {neon}=await import('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);
      queryFn=(q,args=[])=>{let n=0;return sql.query(q.replace(/\?/g,()=>'$'+(++n)),args);};
      transactionFn=statements=>sql.transaction(statements.map(s=>queryFn(s.sql,s.args)),{isolationLevel:'ReadCommitted'});
    }else{
      if(process.env.VERCEL)throw new Error('DATABASE_URL belum diatur. Database permanen diperlukan untuk deployment.');
      const {DatabaseSync}=await import('node:sqlite');
      const dir=process.env.DATA_DIR||path.join(root,'data');fs.mkdirSync(dir,{recursive:true});
      const db=new DatabaseSync(path.join(dir,'village.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');closeFn=()=>db.close();
      const run=(q,args=[])=>{const st=db.prepare(q);return /^\s*(SELECT|WITH)/i.test(q)||/\bRETURNING\b/i.test(q)?st.all(...args):st.run(...args);};
      queryFn=async(q,args=[])=>run(q,args);
      transactionFn=async statements=>{db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>run(s.sql,s.args));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}};
    }
    await queryFn('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, record_id TEXT NOT NULL, mime TEXT NOT NULL, content TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS event_enrollment (event_id TEXT PRIMARY KEY, participant_capacity INTEGER NOT NULL, stall_capacity INTEGER NOT NULL, accepting INTEGER NOT NULL, active INTEGER NOT NULL, closes_at TEXT NOT NULL, ends_at TEXT NOT NULL, version TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS event_registrations (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, mode TEXT NOT NULL, applicant_key TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, data TEXT NOT NULL, note TEXT NOT NULL, product_id TEXT NOT NULL, attended INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(event_id,mode,applicant_key))');
    await queryFn('CREATE INDEX IF NOT EXISTS registrations_event_status ON event_registrations(event_id,mode,status)');
    const existing=await queryFn("SELECT id FROM records WHERE id='__seeded'");
    if(!existing.length){for(const r of seedRecords())await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[r.id,r.kind,r.status,JSON.stringify(r.data),new Date().toISOString()]);await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['__seeded','system','private','{}',new Date().toISOString()]);}
    await migratePortal();
    await seedDirectory();
    await cleanupPortalContent();
    await addOfficialSchools();
    await labelDataSources();
    const siteRows=await queryFn("SELECT data FROM records WHERE id='site'");
    if(siteRows.length){const site=JSON.parse(siteRows[0].data);if(upgradeSite(site))await queryFn("UPDATE records SET data=? WHERE id='site'",[JSON.stringify(site)]);}
    const auth=await queryFn("SELECT data FROM records WHERE id='__auth'");
    if(!auth.length){
      if(process.env.VERCEL&&!process.env.ADMIN_PASSWORD)throw new Error('ADMIN_PASSWORD wajib diatur.');
      const password=process.env.ADMIN_PASSWORD||randomBytes(18).toString('base64url');
      const email=process.env.ADMIN_EMAIL||'admin@margamulya.local';
      if(password.length<12)throw new Error('ADMIN_PASSWORD minimal 12 karakter.');
      await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['__auth','system','private',JSON.stringify({email,password:hashPassword(password)}),new Date().toISOString()]);
      if(!process.env.VERCEL&&!process.env.ADMIN_PASSWORD)fs.writeFileSync(path.join(root,'AKSES-ADMIN-LOKAL.txt'),'Akses admin lokal — jangan publikasikan file ini.\nHalaman: http://localhost:4173/admin\nEmail: '+email+'\nKata sandi: '+password+'\n\nDatabase lokal tersimpan dalam folder data/. Ganti kata sandi melalui menu Akun admin.\n');
    }
  })().catch(e=>{ready=null;throw e;});
  return ready;
}
async function seedDirectory(){
  if((await queryFn("SELECT id FROM records WHERE id='__directory_seeded'")).length)return;
  const rows=await queryFn("SELECT data FROM records WHERE id='site'");
  const demo=rows.length&&JSON.parse(rows[0].data).demo;
  const stamp=new Date().toISOString();
  const statements=demo?directorySeed().map(({table,row})=>{
    const cols=[...Object.keys(row),'created_at','updated_at'];
    return {sql:`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')}) ON CONFLICT(id) DO NOTHING`,args:[...Object.values(row),stamp,stamp]};
  }):[];
  statements.push({sql:"INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__directory_seeded','system','private','{}',?) ON CONFLICT(id) DO NOTHING",args:[stamp]});
  await transactionFn(statements);
}
// Adds the portal tables once per schema version (never drops or rewrites existing data) and seeds verified starter data once.
async function migratePortal(){
  const now=new Date().toISOString();
  const version=await queryFn("SELECT data FROM records WHERE id='__portal_schema'");
  if(!version.length||JSON.parse(version[0].data).version!==SCHEMA_VERSION){
    for(const statement of portalDDL())await queryFn(statement);
    // Additive column migration; "already exists" errors mean the column was added earlier.
    for(const [table,column,type] of extraImageColumns()){
      try{await queryFn(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);}
      catch(e){if(!/duplicate column|already exists/i.test(e.message))throw e;}
    }
    await queryFn("INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__portal_schema','system','private',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",[JSON.stringify({version:SCHEMA_VERSION}),now]);
  }
  if((await queryFn("SELECT id FROM records WHERE id='__portal_seeded'")).length)return;
  for(const {table,row} of portalSeed()){
    const cols=[...Object.keys(row),'created_at','updated_at'];
    await queryFn(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')}) ON CONFLICT(id) DO NOTHING`,[...Object.values(row),now,now]);
  }
  await queryFn("INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__portal_seeded','system','private','{}',?) ON CONFLICT(id) DO NOTHING",[now]);
}
// One-time update (2026-10-01): label every public item with its data status and hide local emergency numbers
// that the village has not verified. 112's description is corrected (availability depends on the local government).
async function labelDataSources(){
  if((await queryFn("SELECT id FROM records WHERE id='__portal_rev6'")).length)return;
  const set=(table,status,where,args=[])=>queryFn(`UPDATE ${table} SET data_status=? WHERE data_status='perlu_verifikasi' AND ${where}`,[status,...args]);
  await set('public_facilities','sumber_pemerintah',"description LIKE '%Kemendikdasmen%'");
  await set('emergency_contacts','sumber_pemerintah',"scope='nasional'");
  await set('development_projects','demo',"title LIKE '%(contoh)%'");
  await set('aid_programs','demo',"name LIKE '%(contoh)%'");
  await queryFn("UPDATE emergency_contacts SET is_active=0 WHERE scope='lokal' AND data_status<>'terverifikasi'");
  await queryFn('UPDATE emergency_contacts SET description=? WHERE id=? AND description=?',[emergency112,'em-112','Satu nomor untuk berbagai keadaan darurat. Bebas pulsa.']);
  await queryFn("INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__portal_rev6','system','private','{}',?) ON CONFLICT(id) DO NOTHING",[new Date().toISOString()]);
}
// One-time data update (2026-10-01): schools from the official Kemendikdasmen reference data. Existing seeded rows
// are refreshed only while they still carry the demo note; new schools are inserted if missing.
async function addOfficialSchools(){
  if((await queryFn("SELECT id FROM records WHERE id='__portal_rev5'")).length)return;
  const now=new Date().toISOString();
  for(const [id,name,category,address,latitude,longitude,phone,image_url,description] of officialSchools){
    await queryFn('INSERT INTO public_facilities (id,name,category,description,address,latitude,longitude,phone,opening_hours,image_url,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(id) DO NOTHING',[id,name,category,description,address,latitude,longitude,phone,'',image_url,now,now]);
    await queryFn('UPDATE public_facilities SET name=?,address=?,latitude=?,longitude=?,description=?,updated_at=? WHERE id=? AND description=?',[name,address,latitude,longitude,description,now,id,approxNote]);
  }
  await queryFn("INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__portal_rev5','system','private','{}',?) ON CONFLICT(id) DO NOTHING",[now]);
}
// One-time content fix (2026-09-30): no places of worship on the public map (SARA rule) and no
// "Google Maps" source notes; demo coordinates/phones are labelled as approximate instead.
async function cleanupPortalContent(){
  if((await queryFn("SELECT id FROM records WHERE id='__portal_rev4'")).length)return;
  const worship=['fas-masjid-alfalah','fas-masjid-baituttaqwa','fas-kelenteng'];
  for(const id of worship){await queryFn('DELETE FROM media WHERE record_id=?',['portal:public_facilities:'+id]);await queryFn('DELETE FROM public_facilities WHERE id=?',[id]);}
  await queryFn("UPDATE public_facilities SET category='lainnya', is_active=0 WHERE category='ibadah'");
  const notes=[
    ['public_facilities','Sumber lokasi: listing Google Maps, diperiksa September 2026.',approxNote],
    ['public_facilities','Nomor telepon dari listing Google Maps; konfirmasi ke pemerintah desa.','Nomor telepon perlu dikonfirmasi ke pemerintah desa.'],
    ['emergency_contacts','Sumber: listing Google Maps; konfirmasi ke pemerintah desa.','Nomor perlu dikonfirmasi ke pemerintah desa.'],
    ['emergency_contacts','Sumber: listing Google Maps.','Nomor perlu dikonfirmasi ulang.'],
    ['tourism_places','Nomor kontak berasal dari listing Google Maps dan dapat berubah.','Nomor kontak perlu dikonfirmasi ulang kepada pengelola.']
  ];
  for(const [table,from,to] of notes)await queryFn(`UPDATE ${table} SET description=REPLACE(description,?,?) WHERE description LIKE ?`,[from,to,'%'+from+'%']);
  await queryFn("INSERT INTO records (id,kind,status,data,updated_at) VALUES ('__portal_rev4','system','private','{}',?) ON CONFLICT(id) DO NOTHING",[new Date().toISOString()]);
}
// Brings an existing site record up to date with new menu keys/pages and fills placeholders with verified location data.
function upgradeSite(site){
  let changed=false;const revision=site.designRevision||1;
  if(!site.heroSlides&&site.heroImage){site.heroSlides=[{image:site.heroImage,caption:site.heroCaption||''}];if(site.heroImage==='/images/pesisir-tangerang.jpg')site.heroSlides.push(structuredClone(siteSeed.heroSlides[1]));changed=true;}
  // Any new top-level setting (e.g. dataSections, homepage texts) is filled from the seed; existing admin values are never overwritten.
  for(const [k,v] of Object.entries(siteSeed))if(site[k]===undefined){site[k]=structuredClone(v);changed=true;}
  for(const k of ['nav','labels','pages'])for(const [key,value] of Object.entries(siteSeed[k]))if(!(key in site[k])){site[k][key]=structuredClone(value);changed=true;}
  if(site.pages?.wisata?.intro==="Pantai dan tempat menarik di Desa Marga Mulya. Informasi tiket dan jam buka ditampilkan jika sudah dikonfirmasi pengelola."){site.pages.wisata.intro=siteSeed.pages.wisata.intro;changed=true;}
  // Peta Desa merged into Wisata: refresh the Wisata intro only if the admin never changed it from the previous default.
  if(site.pages?.wisata?.intro==="Jelajahi destinasi pesisir, temukan penginapan warga, dan kenali desa bersama pemandu lokal."){site.pages.wisata.intro=siteSeed.pages.wisata.intro;changed=true;}
  // Design revision 2: the village requested a plain background with Banten cultural ornaments.
  if(revision<2){if(!site.backgroundStyle||site.backgroundStyle==='gelombang')site.backgroundStyle='budaya';site.designRevision=Math.max(site.designRevision||0,2);changed=true;}
  // Revision 4: complete groups B, C and E of the EcoQuest data structure. A group is replaced only while it
  // still holds the untouched demo values (label:value signature), so admin edits are never overwritten.
  if(revision<4){
    const sig=s=>s.title+'|'+s.rows.map(r=>r.label+':'+r.value).join(',');
    const old={
      'Pemerintahan desa|Aparat desa:14,Anggota Linmas:24,Pos kamling:12,Pos polisi:1,Jumlah RW:6,Jumlah RT:24,Kantor desa & balai desa:2':['Pemerintahan desa','Aparat desa & kecamatan'],
      'Mata pencaharian pokok|Nelayan:412,Petani & petambak:358,Karyawan swasta:287,Pengrajin & UMKM:164,Guru:38,PNS:22,TNI / POLRI:9,Lainnya:182':['Mata pencaharian pokok'],
      'Pendidikan|PAUD / TK:3,SD/MI negeri & swasta:3,SLTP/MTs:1,Guru:46,Murid:912,Ruang kelas:38,Lembaga kursus (menjahit, komputer):2,Kelompok Paket A/B/C:2':['Sekolah menurut jenjang','Guru, murid & ruang kelas','Pendidikan non-formal & luar sekolah']
    };
    if(Array.isArray(site.dataSections))site.dataSections=site.dataSections.flatMap(s=>{const titles=old[sig(s)];return titles?structuredClone(siteSeed.dataSections.filter(x=>titles.includes(x.title))):[s];});
    if(site.mapIntro==='Pantai, sekolah, tempat ibadah, layanan kesehatan, dan keamanan di sekitar desa.')site.mapIntro=siteSeed.mapIntro;
    site.designRevision=4;changed=true;
  }
  // Revision 3: Lapak Desa moves up on the homepage, but only when the admin never changed the section order.
  if(revision<3){if(JSON.stringify(site.homeSections)===JSON.stringify(legacyHomeOrder.map(key=>({key,visible:true}))))site.homeSections=homeSectionKeys.map(key=>({key,visible:true}));site.designRevision=Math.max(site.designRevision||0,3);changed=true;}
  // Revision 5: the "Kondisi pesisir" homepage block was removed; drop any leftover entry.
  if(revision<5){if(Array.isArray(site.homeSections)){const before=site.homeSections.length;site.homeSections=site.homeSections.filter(x=>x.key!=='coastal');if(site.homeSections.length!==before)changed=true;}site.designRevision=Math.max(site.designRevision||0,5);changed=true;}
  // Replace untouched demo defaults that no longer fit a coastal village.
  if(site.heroImage==='/images/hero.webp'&&site.heroCaption==='Lanskap perdesaan di Jawa · foto ilustrasi'){site.heroImage=siteSeed.heroImage;site.heroCaption=siteSeed.heroCaption;site.heroSlides=structuredClone(siteSeed.heroSlides);changed=true;}
  if(JSON.stringify(site.occupations)==='[{"label":"Pertanian","value":40},{"label":"Wiraswasta","value":27},{"label":"Karyawan","value":21},{"label":"Lainnya","value":12}]'){site.occupations=structuredClone(siteSeed.occupations);changed=true;}
  if(site.address==='Alamat kantor desa belum dikonfirmasi'){site.address=siteSeed.address;changed=true;}
  if(!site.mapUrl){site.mapUrl=siteSeed.mapUrl;changed=true;}
  if(site.geography?.startsWith('Data batas wilayah, luas desa')){site.geography=siteSeed.geography;changed=true;}
  for(const credit of siteSeed.credits)if(!site.credits.some(c=>c.source===credit.source)){site.credits.push(credit);changed=true;}
  return changed;
}
export const parseRow=r=>({id:r.id,kind:r.kind,status:r.status,...JSON.parse(r.data),updatedAt:r.updated_at});
export async function getRecord(id){const rows=await query('SELECT * FROM records WHERE id=?',[id]);return rows.length?parseRow(rows[0]):null;}
export async function putRecord(id,kind,status,data){await query('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,status=excluded.status,data=excluded.data,updated_at=excluded.updated_at',[id,kind,status,JSON.stringify(data),new Date().toISOString()]);return getRecord(id);}

import express from 'express';
import {randomBytes,randomUUID} from 'node:crypto';
import {query,transaction,getRecord,putRecord,parseRow,hash,verifyPassword,hashPassword} from './db.mjs';
import {validateEnrollment,saveEvent,publicEnrollment,mountRegistrations,refreshEventTimes} from './registrations.mjs';
import {mountPortal,portalMediaVisible,pruneMedia,imageList} from './portal.mjs';
import {homeSectionKeys} from './seed.mjs';
const app=express();
app.disable('x-powered-by');
// Up to 3 compressed photos per form (hero slides: 5) fit comfortably below Vercel's 4.5 MB request limit.
app.use(express.json({limit:'4mb'}));
app.use((req,res,next)=>{
  res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','strict-origin-when-cross-origin');
  res.set('X-Frame-Options','SAMEORIGIN');
  if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){
    const origin=req.headers.origin;
    // Opaque origins such as "null" are not parseable URLs; treat them as cross-site instead of crashing.
    let crossOrigin=false;if(origin){try{crossOrigin=new URL(origin).host!==req.get('host');}catch{crossOrigin=true;}}
    if(req.headers['sec-fetch-site']==='cross-site'||crossOrigin)return res.status(403).json({error:'Permintaan tidak diizinkan.'});
  }next();
});
const fail=(msg,status=400)=>Object.assign(new Error(msg),{status});
const clean=(v,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
const kinds=['article','event','product','gallery'];
const cookieToken=req=>{const m=(req.headers.cookie||'').match(/(?:^|;\s*)mm_session=([^;]+)/);return m?m[1]:'';};
async function isAdmin(req){const token=cookieToken(req);if(!token)return false;return (await query('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?',[hash(token),new Date().toISOString()])).length>0;}
async function auth(req,res,next){if(!await isAdmin(req))return res.status(401).json({error:'Silakan masuk sebagai admin.'});next();}
async function rate(req,type,max,minutes){
  const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress):req.socket.remoteAddress;
  const key=type+':'+hash(String(ip));const rows=await query('SELECT * FROM attempts WHERE key=?',[key]);
  if(rows.length&&rows[0].reset_at>new Date().toISOString()&&rows[0].count>=max)throw fail('Terlalu banyak percobaan. Silakan coba lagi beberapa saat.',429);
  const reset=new Date(Date.now()+minutes*60000).toISOString();
  await query('INSERT INTO attempts (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN attempts.reset_at>? THEN attempts.count+1 ELSE 1 END,reset_at=CASE WHEN attempts.reset_at>? THEN attempts.reset_at ELSE excluded.reset_at END',[key,reset,new Date().toISOString(),new Date().toISOString()]);
}
function imageSafe(value){
  const v=clean(value,2400000);if(!v)return '';
  if(/^\/images\/[a-z0-9_.-]+$/i.test(v))return v;
  if(/^\/api\/media\/[a-z0-9-]+$/i.test(v))return v;
  if(/^https:\/\//.test(v)){const url=new URL(v);if(!url.username&&!url.password)return v;}
  const m=v.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if(m){const b=Buffer.from(m[2],'base64');const type=m[1];if(b.length>1600000)throw fail('Gambar terlalu besar. Maksimal 1,5 MB.');if((type==='jpeg'&&b[0]===255&&b[1]===216)||(type==='png'&&b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')||(type==='webp'&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'))return v;}
  throw fail('Gunakan gambar JPG, PNG, WebP, atau alamat HTTPS yang valid.');
}
const persistAll=async(list,recordId)=>{const out=[];for(const v of list)out.push(await persistImage(v,recordId));return out;};
async function persistImage(value,recordId){
  if(value.startsWith('/api/media/')){
    const rows=await query('SELECT record_id FROM media WHERE id=?',[value.split('/').pop()]);
    if(!rows.length||rows[0].record_id!==recordId)throw fail('Gambar tidak sesuai dengan konten ini.');
  }
  const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if(!match)return value;
  // Uploaded images live in the database; keep total usage below the free database plan (configurable).
  const limit=Number(process.env.MEDIA_LIMIT_MB||300)*1024*1024;
  const used=Number((await query('SELECT COALESCE(SUM(LENGTH(content)),0) AS total FROM media'))[0].total);
  if(used+match[2].length>limit)throw fail('Ruang penyimpanan foto hampir penuh. Hapus foto lama yang tidak dipakai, lalu coba lagi.',507);
  const id=randomUUID();await query('INSERT INTO media(id,record_id,mime,content) VALUES(?,?,?,?)',[id,recordId,match[1],match[2]]);
  return '/api/media/'+id;
}
const dateSafe=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const publicRecord=r=>{const {submissionToken,privateContact,moderationNote,consent,...p}=r;return p;};
function validate(kind,input){
  const d={};
  const allowed={article:['title','category','excerpt','body','imageCredit','date'],event:['title','category','date','endDate','time','endTime','location','organizer','description','eventStatus','contact'],product:['title','category','description','unit','seller','area','phone','imageCredit','availability'],gallery:['title','category','description','imageCredit','date']}[kind];
  if(!allowed)throw fail('Jenis konten tidak dikenal.');
  for(const k of allowed)d[k]=clean(input[k],['body','description'].includes(k)?12000:500);
  if(d.title.length<3)throw fail('Judul minimal 3 karakter.');
  if(kind!=='event'){
    const list=Array.isArray(input.images)?input.images:[input.image];
    d.images=imageList(list[0]||'',list.slice(1),imageSafe);d.image=d.images[0]||'';
  }
  if(kind==='article'){if(!d.body)throw fail('Isi informasi wajib diisi.');d.featured=!!input.featured;if(!dateSafe(d.date))throw fail('Tanggal tidak valid.');}
  if(kind==='gallery'&&!d.image)throw fail('Foto galeri wajib diisi.');
  if(kind==='gallery'){d.sortOrder=Number(input.sortOrder??100);if(!Number.isInteger(d.sortOrder)||d.sortOrder<0||d.sortOrder>9999)throw fail('Urutan tampil berupa angka 0–9999.');}
  if(kind==='product'){
    d.price=Number(input.price);if(!Number.isFinite(d.price)||d.price<0||d.price>1e12)throw fail('Harga tidak valid.');
    if(!d.seller||!d.description||!d.category)throw fail('Lengkapi penjual, kategori, dan deskripsi.');
    if(d.phone&&!/^\+?[\d\s-]{8,20}$/.test(d.phone))throw fail('Nomor kontak tidak valid.');
    if(!['Tersedia','Pesan dahulu','Habis'].includes(d.availability))throw fail('Ketersediaan tidak valid.');
    d.featured=!!input.featured;d.consent=!!input.consent;
  }
  if(kind==='event'){
    if(!dateSafe(d.date)||!dateSafe(d.endDate)||d.endDate<d.date)throw fail('Tanggal akhir harus sama atau setelah tanggal mulai.');
    if(!/^\d{2}:\d{2}$/.test(d.time)||!/^\d{2}:\d{2}$/.test(d.endTime)||[d.time,d.endTime].some(t=>Number(t.slice(0,2))>23||Number(t.slice(3))>59))throw fail('Waktu agenda tidak valid.');
    if(d.date===d.endDate&&d.endTime<=d.time)throw fail('Waktu selesai harus setelah waktu mulai.');
    if(!['Terjadwal','Ditunda','Dibatalkan','Selesai'].includes(d.eventStatus))throw fail('Status agenda tidak valid.');
    d.productIds=Array.isArray(input.productIds)?input.productIds.filter(v=>typeof v==='string').slice(0,20):[];
    validateEnrollment(input,d);
  }
  return d;
}
app.get('/api/health',async(req,res)=>{await query('SELECT 1 AS ok');res.json({ok:true});});
app.get('/api/media/:id',async(req,res)=>{
  const rows=await query('SELECT * FROM media WHERE id=?',[req.params.id]);
  if(!rows.length)throw fail('Gambar tidak ditemukan.',404);
  const item=rows[0];let visible=false;
  if(item.record_id.startsWith('portal:'))visible=await portalMediaVisible(item.record_id);
  else if(!item.record_id.startsWith('complaint:')){const record=await getRecord(item.record_id);visible=!!record&&record.status==='published';}
  if(!visible&&!await isAdmin(req))throw fail('Gambar tidak ditemukan.',404);
  // Media ids are immutable, so public images can be cached briefly; private ones never are.
  if(visible)res.set('Cache-Control','public, max-age=3600');
  res.set('Content-Type',item.mime).send(Buffer.from(item.content,'base64'));
});
app.get('/api/content',async(req,res)=>{
  const rows=(await query("SELECT * FROM records WHERE status='published' AND kind IN ('site','article','event','product','gallery')")).map(parseRow);
  const products=rows.filter(r=>r.kind==='product');const pids=new Set(products.map(p=>p.id));
  const enrollment=await publicEnrollment();
  res.json({site:rows.find(r=>r.kind==='site'),articles:rows.filter(r=>r.kind==='article').map(publicRecord),events:rows.filter(r=>r.kind==='event').map(r=>({...publicRecord(r),enrollment:enrollment.get(r.id),productIds:[...new Set([...(r.productIds||[]),...(enrollment.get(r.id)?.productIds||[])])].filter(id=>pids.has(id))})),products:products.map(publicRecord),gallery:rows.filter(r=>r.kind==='gallery').map(publicRecord)});
});
app.post('/api/login',async(req,res)=>{
  await rate(req,'login',8,15);const a=await getRecord('__auth');
  if(clean(req.body.email).toLowerCase()!==a.email.toLowerCase()||!verifyPassword(clean(req.body.password,200),a.password))throw fail('Email atau kata sandi tidak sesuai.',401);
  const token=randomBytes(32).toString('hex');await query('DELETE FROM sessions WHERE expires_at<?',[new Date().toISOString()]);
  await query('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)',[hash(token),new Date(Date.now()+8*3600000).toISOString()]);
  res.cookie('mm_session',token,{httpOnly:true,sameSite:'strict',secure:!!process.env.VERCEL,maxAge:8*3600000,path:'/'});
  res.json({email:a.email});
});
app.get('/api/session',async(req,res)=>res.json({authenticated:await isAdmin(req)}));
app.post('/api/logout',async(req,res)=>{await query('DELETE FROM sessions WHERE token_hash=?',[hash(cookieToken(req))]);res.clearCookie('mm_session',{path:'/'});res.json({ok:true});});
app.get('/api/admin/content',auth,async(req,res)=>res.json((await query("SELECT * FROM records WHERE kind IN ('site','article','event','product','gallery') ORDER BY updated_at DESC")).map(parseRow)));
app.put('/api/admin/site',auth,async(req,res)=>{
  const current=await getRecord('site');const d={...current};delete d.id;delete d.kind;delete d.status;delete d.updatedAt;
  const strings=['name','identity','area','heroTitle','heroText','heroCaption','about','history','vision','missions','geography','address','phone','email','mapUrl','hours','timezone','footer','demoNote','dataPeriod','dataSource','sourceUrl','homeProfileTitle','regionLines','weatherPlace','tourismIntro','marketIntro','mapIntro','projectsIntro'];
  for(const k of strings)if(k in req.body)d[k]=clean(req.body[k],12000);
  if(!d.name||!d.heroTitle||!d.about)throw fail('Nama desa, judul utama, dan profil wajib diisi.');
  try{new Intl.DateTimeFormat('id-ID',{timeZone:d.timezone});}catch{throw fail('Zona waktu tidak valid.');}
  for(const k of ['mapUrl','sourceUrl'])if(d[k]&&!/^https:\/\//.test(d[k]))throw fail('Tautan harus menggunakan HTTPS.');
  if(Array.isArray(req.body.heroSlides)){
    if(req.body.heroSlides.length>5)throw fail('Slide beranda maksimal 5 foto.');
    d.heroSlides=[];for(const s of req.body.heroSlides){const image=imageSafe(s?.image);if(!image)throw fail('Setiap slide beranda wajib memiliki foto.');d.heroSlides.push({image:await persistImage(image,'site'),caption:clean(s.caption,200)});}
    if(!d.heroSlides.length)throw fail('Isi minimal satu foto slide beranda.');
  }
  d.heroImage=d.heroSlides?.[0]?.image||await persistImage(imageSafe(req.body.heroImage??d.heroImage),'site');d.heroCaption=d.heroSlides?.[0]?.caption??d.heroCaption;
  if('logo' in req.body)d.logo=await persistImage(imageSafe(req.body.logo),'site');
  if(Array.isArray(req.body.heroButtons))d.heroButtons=req.body.heroButtons.slice(0,2).map(b=>{const x={label:clean(b.label,40),href:clean(b.href,120)};if(x.label&&!/^\/[a-z0-9\-/?=&]*$/i.test(x.href))throw fail('Tautan tombol beranda harus alamat internal, misalnya /wisata.');return x;}).filter(b=>b.label);
  if(Array.isArray(req.body.homeSections)){
    const known=homeSectionKeys;const seen=new Set();
    d.homeSections=req.body.homeSections.filter(s=>known.includes(s?.key)&&!seen.has(s.key)&&seen.add(s.key)).map(s=>({key:s.key,visible:s.visible!==false}));
    for(const key of known)if(!seen.has(key))d.homeSections.push({key,visible:false});
  }
  if('backgroundStyle' in req.body){if(!['budaya','gelombang','anyaman','polos'].includes(req.body.backgroundStyle))throw fail('Motif latar tidak dikenal.');d.backgroundStyle=req.body.backgroundStyle;}
  d.demo=req.body.demo!==false;
  for(const [k,min,max] of [['villageLat',-90,90],['villageLng',-180,180],['officeLat',-90,90],['officeLng',-180,180]])if(k in req.body){const n=Number(req.body[k]);if(req.body[k]===''||!Number.isFinite(n)||n<min||n>max)throw fail('Koordinat peta tidak valid.');d[k]=n;}
  for(const k of ['nav','labels'])if(req.body[k])for(const key of Object.keys(d[k]))d[k][key]=clean(req.body[k][key]||d[k][key],100);
  if(req.body.pages)for(const key of Object.keys(d.pages))for(const field of ['eyebrow','title','intro'])if(field in (req.body.pages[key]||{}))d.pages[key][field]=clean(req.body.pages[key][field],field==='intro'?1000:150);
  for(const k of ['stats','population','occupations'])if(Array.isArray(req.body[k])){
    d[k]=req.body[k].slice(0,12).map(r=>({label:clean(r.label,100),value:k==='stats'?clean(String(r.value),30):Math.max(0,Number(r.value)||0),...(k==='stats'?{unit:clean(r.unit,30)}:{})}));
  }
  for(const k of ['productCategories','eventCategories'])if(Array.isArray(req.body[k]))d[k]=req.body[k].map(s=>clean(s,60)).filter(Boolean).slice(0,20);
  if(Array.isArray(req.body.dataSections)){
    if(req.body.dataSections.length>24)throw fail('Maksimal 24 kelompok data desa.');
    d.dataSections=req.body.dataSections.map(s=>{
      const section={code:clean(s.code,4).toUpperCase(),title:clean(s.title,120),chart:s.chart==='bar'?'bar':'table',note:clean(s.note,300),link:clean(s.link,120)};
      if(!section.title)throw fail('Setiap kelompok data desa wajib memiliki judul.');
      if(section.link&&!/^\/[a-z0-9\-/?=&]*$/i.test(section.link))throw fail('Tautan kelompok data harus alamat internal, misalnya /wisata.');
      if(!Array.isArray(s.rows)||s.rows.length>40)throw fail('Setiap kelompok data berisi maksimal 40 baris.');
      section.rows=s.rows.map(r=>({label:clean(r.label,120),value:clean(String(r.value??''),60),unit:clean(r.unit,30)})).filter(r=>r.label);
      if(section.chart==='bar'&&section.rows.some(r=>!Number.isFinite(Number(r.value.replace(/\./g,'').replace(',','.')))))throw fail(`Grafik “${section.title}” hanya menerima angka pada kolom nilai.`);
      return section;
    });
  }
  if(Array.isArray(req.body.credits))d.credits=req.body.credits.slice(0,30).map(r=>{const c={};for(const k of ['title','author','source','license','licenseUrl'])c[k]=clean(r[k],500);for(const k of ['source','licenseUrl'])if(c[k]&&!/^https:\/\//.test(c[k]))throw fail('Tautan sumber dan lisensi harus menggunakan HTTPS.');return c;});
  const saved=await putRecord('site','site','published',d);
  await pruneMedia('site',[saved.heroImage,saved.logo,...(saved.heroSlides||[]).map(s=>s.image)]);
  if(saved.timezone!==current.timezone)await refreshEventTimes();
  res.json(saved);
});
app.post('/api/admin/records',auth,async(req,res)=>{
  const {kind}=req.body;if(!kinds.includes(kind))throw fail('Jenis tidak valid.');const status=req.body.status||'draft';if(!['draft','published'].includes(status))throw fail('Konten baru harus disimpan sebagai draf atau terbit.');const d=validate(kind,req.body);const id=randomUUID();
  if(kind==='product'&&d.phone&&!d.consent)throw fail('Izin publikasi kontak wajib dikonfirmasi.');
  if(d.images){d.images=await persistAll(d.images,id);d.image=d.images[0]||'';}
  res.status(201).json(kind==='event'?await saveEvent(id,status,d):await putRecord(id,kind,status,d));
});
app.put('/api/admin/records/:id',auth,async(req,res)=>{
  const old=await getRecord(req.params.id);if(!old||!kinds.includes(old.kind))throw fail('Konten tidak ditemukan.',404);
  if(req.body.updatedAt&&req.body.updatedAt!==old.updatedAt)throw fail('Konten telah berubah. Muat ulang sebelum menyimpan.',409);
  const allowed=old.kind==='product'?['draft','pending','published','revision','rejected','archived']:['draft','published','archived'];
  if(!allowed.includes(req.body.status))throw fail('Status tidak valid.');
  const d=validate(old.kind,req.body);
  if(d.images){d.images=await persistAll(d.images,old.id);d.image=d.images[0]||'';}
  if(old.kind==='product'){
    if(d.phone&&!d.consent)throw fail('Izin publikasi kontak wajib dikonfirmasi.');
    d.moderationNote=clean(req.body.moderationNote,2000);
    if(['rejected','revision'].includes(req.body.status)&&!d.moderationNote)throw fail('Alasan perbaikan atau penolakan wajib diisi.');
    d.privateContact=old.privateContact||'';d.submissionToken=old.submissionToken||'';
  }
  const saved=old.kind==='event'?await saveEvent(old.id,req.body.status,d,old.updatedAt):await putRecord(old.id,old.kind,req.body.status,d);
  if(old.kind!=='event')await pruneMedia(old.id,d.images||[]);
  res.json(saved);
});
app.delete('/api/admin/records/:id',auth,async(req,res)=>{
  const r=await getRecord(req.params.id);if(!r||!kinds.includes(r.kind))throw fail('Konten tidak ditemukan.',404);
  if(r.kind==='event'){
    const results=await transaction([
      {sql:'UPDATE event_enrollment SET version=version WHERE event_id=?',args:[r.id]},
      {sql:'DELETE FROM records WHERE id=? AND NOT EXISTS(SELECT 1 FROM event_registrations WHERE event_id=?) RETURNING id',args:[r.id,r.id]},
      {sql:'DELETE FROM event_enrollment WHERE event_id=? AND NOT EXISTS(SELECT 1 FROM records WHERE id=?)',args:[r.id,r.id]}
    ]);
    if(!results[1].length)throw fail('Agenda memiliki pendaftaran. Arsipkan agenda untuk mempertahankan riwayat pemohon.',409);
  }else await query('DELETE FROM records WHERE id=?',[r.id]);
  await query('DELETE FROM media WHERE record_id=?',[r.id]);res.json({ok:true});
});
app.post('/api/submissions',async(req,res)=>{
  await rate(req,'submit',8,60);
  if(req.body.website)throw fail('Pengajuan tidak dapat diproses.');
  // Public submissions must upload the photo itself; external URLs would load third-party content in the admin's browser.
  const photos=Array.isArray(req.body.images)?req.body.images:[req.body.image];
  if(!photos.length||photos.some(p=>typeof p!=='string'||!p.startsWith('data:image/')))throw fail('Unggah foto produk berformat JPG, PNG, atau WebP.');
  const d=validate('product',{...req.body,images:photos,availability:req.body.availability||'Tersedia'});
  if(!d.image||!d.phone||!d.consent)throw fail('Foto, kontak, dan izin publikasi kontak wajib diisi.');
  const token=randomBytes(24).toString('hex');d.submissionToken=hash(token);d.privateContact=d.phone;d.featured=false;
  const id=randomUUID();d.images=await persistAll(d.images,id);d.image=d.images[0];
  const item=await putRecord(id,'product','pending',d);
  res.status(201).json({id:item.id,token,status:'pending',message:'Pengajuan diterima. Produk akan tampil setelah disetujui admin.'});
});
app.post('/api/submissions/status',async(req,res)=>{
  await rate(req,'track',30,10);
  const token=clean(req.body.token,100);const rows=await query("SELECT * FROM records WHERE kind='product'");
  const r=rows.map(parseRow).find(v=>v.submissionToken===hash(token));
  if(!r)throw fail('Kode pengajuan tidak ditemukan.',404);
  res.json({title:r.title,status:r.status,note:r.moderationNote||'',updatedAt:r.updatedAt});
});
app.put('/api/admin/password',auth,async(req,res)=>{
  const a=await getRecord('__auth');if(!verifyPassword(clean(req.body.currentPassword,200),a.password))throw fail('Kata sandi lama tidak sesuai.');
  const p=clean(req.body.password,200);if(p.length<12)throw fail('Kata sandi baru minimal 12 karakter.');
  await putRecord('__auth','system','private',{email:a.email,password:hashPassword(p)});
  await query('DELETE FROM sessions WHERE token_hash<>?',[hash(cookieToken(req))]);res.json({ok:true});
});
mountRegistrations(app,{auth,rate});
mountPortal(app,{auth,rate,imageSafe,persistImage});
app.use('/api',(req,res)=>res.status(404).json({error:'Layanan tidak ditemukan.'}));
app.use((err,req,res,next)=>{if(!req.path.startsWith('/api'))return next(err);console.error(err.status?err.message:err);res.status(err.status||500).json({error:err.status?err.message:'Terjadi gangguan. Silakan coba lagi.'});});
export default app;

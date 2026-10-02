import {randomBytes,randomUUID} from 'node:crypto';
import {query,transaction,getRecord,hash} from '../../database/db.mjs';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const now=()=>new Date().toISOString();
const lock=eventId=>({sql:'UPDATE event_enrollment SET version=version WHERE event_id=?',args:[eventId]});
const capacity="CASE WHEN mode='participant' THEN participant_capacity ELSE stall_capacity END";
const countFor=(mode)=>`(SELECT COUNT(*) FROM event_registrations WHERE event_id=event_enrollment.event_id AND mode='${mode}' AND status='approved')`;
const modes=['participant','stall'];
const statuses=['pending','revision','approved','rejected','cancelled'];
const rowData=r=>({...JSON.parse(r.data),id:r.id,eventId:r.event_id,mode:r.mode,status:r.status,note:r.note,productId:r.product_id,attended:!!r.attended,createdAt:r.created_at,updatedAt:r.updated_at});
const required=(value,label,min,max)=>{const text=typeof value==='string'?value.trim():'';if(text.length<min||text.length>max)throw fail(`${label} wajib diisi (${min}–${max} karakter).`);return text;};

export function validateEnrollment(input,event){
  event.registrationOpen=input.registrationOpen===true;
  for(const field of ['participantCapacity','stallCapacity']){
    const value=Number(input[field]??0);
    if(!Number.isInteger(value)||value<0||value>10000)throw fail('Kuota harus berupa angka 0–10.000. Isi 0 jika jenis pendaftaran tidak digunakan.');
    event[field]=value;
  }
  event.registrationDeadline=typeof input.registrationDeadline==='string'?input.registrationDeadline.trim():'';
  if(event.registrationOpen&&!event.participantCapacity&&!event.stallCapacity)throw fail('Isi minimal satu kuota sebelum membuka pendaftaran.');
  if(event.registrationDeadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(event.registrationDeadline)||Number.isNaN(Date.parse(event.registrationDeadline))||new Date(event.registrationDeadline).toISOString().slice(0,10)!==event.registrationDeadline||event.registrationDeadline>event.date))throw fail('Batas pendaftaran harus berupa tanggal valid, paling lambat tanggal mulai kegiatan.');
  return event;
}

// The enrollment row serializes approvals and quota edits in both databases.
const defaultTimeZone='Asia/Jakarta';
async function siteTimeZone(){
  const tz=(await getRecord('site'))?.timezone;
  if(!tz)return defaultTimeZone;
  try{new Intl.DateTimeFormat('en-US',{timeZone:tz});return tz;}catch{return defaultTimeZone;}
}
// Converts a wall-clock date/time in an IANA time zone to a UTC ISO string (two passes handle DST edges).
export function zonedToUtc(date,time,timeZone){
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const offset=t=>{const p=Object.fromEntries(fmt.formatToParts(new Date(t)).map(x=>[x.type,x.value]));return Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute,+p.second)-t;};
  const wall=Date.parse(`${date}T${time.length===5?time+':00':time}Z`);
  let t=wall-offset(wall);t=wall-offset(t);
  return new Date(t).toISOString();
}
function eventTimes(data,timeZone){
  const starts=zonedToUtc(data.date,data.time,timeZone);
  const ends=zonedToUtc(data.endDate,data.endTime,timeZone);
  const deadline=data.registrationDeadline?zonedToUtc(data.registrationDeadline,'23:59:59',timeZone):starts;
  return {starts,ends,closes:deadline<starts?deadline:starts};
}
// Re-applies the site time zone to every event after the admin changes it.
export async function refreshEventTimes(){
  const tz=await siteTimeZone();
  for(const r of await query("SELECT id,data FROM records WHERE kind='event'")){
    const t=eventTimes(JSON.parse(r.data),tz);
    await query('UPDATE event_enrollment SET closes_at=?,ends_at=? WHERE event_id=?',[t.closes,t.ends,r.id]);
  }
}
export async function saveEvent(id,status,data,expectedVersion){
  const version=randomUUID(),stamp=now();
  const {ends,closes}=eventTimes(data,await siteTimeZone());
  const active=status==='published'&&data.eventStatus==='Terjadwal';
  const result=await transaction([
    {sql:"INSERT INTO event_enrollment(event_id,participant_capacity,stall_capacity,accepting,active,closes_at,ends_at,version) VALUES (?,0,0,0,0,'','','') ON CONFLICT(event_id) DO NOTHING",args:[id]},
    lock(id),
    {sql:`UPDATE event_enrollment SET participant_capacity=?,stall_capacity=?,accepting=?,active=?,closes_at=?,ends_at=?,version=? WHERE event_id=? AND ${countFor('participant')}<=? AND ${countFor('stall')}<=? AND (?='' OR EXISTS(SELECT 1 FROM records WHERE id=? AND updated_at=?)) RETURNING event_id`,args:[data.participantCapacity,data.stallCapacity,active&&data.registrationOpen?1:0,active?1:0,closes,ends,version,id,data.participantCapacity,data.stallCapacity,expectedVersion||'',id,expectedVersion||'']},
    {sql:"INSERT INTO records(id,kind,status,data,updated_at) SELECT ?,'event',?,?,? WHERE EXISTS(SELECT 1 FROM event_enrollment WHERE event_id=? AND version=?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,data=excluded.data,updated_at=excluded.updated_at RETURNING id",args:[id,status,JSON.stringify(data),stamp,id,version]}
  ]);
  if(!result[3].length)throw fail('Agenda telah berubah atau kuota lebih kecil dari jumlah yang sudah disetujui. Muat ulang dan periksa kuota.',409);
  return getRecord(id);
}

function validateApplicant(input){
  const name=required(input.name,'Nama lengkap',3,120);
  const address=required(input.address,'Alamat tempat tinggal lengkap',10,500);
  const rawPhone=required(input.phone,'Nomor HP/WhatsApp',9,25).replace(/[\s()-]/g,'');
  if(!/^(?:\+62|62|0)8\d{7,11}$/.test(rawPhone))throw fail('Isi nomor HP/WhatsApp Indonesia yang valid, misalnya 081234567890.');
  const phone=rawPhone.replace(/^\+/, '').replace(/^0/,'62');
  const area={};for(const field of ['rt','rw']){const v=String(input[field]??'').trim();if(!/^\d{1,3}$/.test(v)||Number(v)<1)throw fail(`${field.toUpperCase()} wajib berupa angka 1–999.`);area[field]=v.padStart(3,'0');}
  if(input.consent!==true)throw fail('Persetujuan penggunaan data untuk pengelolaan kegiatan wajib diberikan.');
  const data={name,address,phone,...area,consent:true};
  if(input.mode==='stall'){
    data.businessName=required(input.businessName,'Nama usaha',3,150);
    data.productSummary=required(input.productSummary,'Produk yang akan dijual',5,1500);
  }
  return data;
}
const applicantKey=d=>hash(d.name.toLocaleLowerCase('id-ID').replace(/\s+/g,' ')+'|'+d.phone);
async function fromToken(token){
  if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token.trim()))throw fail('Kode pendaftaran tidak ditemukan.',404);
  const rows=await query('SELECT * FROM event_registrations WHERE token_hash=?',[hash(token.trim())]);
  if(!rows.length)throw fail('Kode pendaftaran tidak ditemukan.',404);
  return rows[0];
}
async function registrationAvailable(eventId,mode){
  const rows=await query('SELECT * FROM event_enrollment WHERE event_id=?',[eventId]);
  const r=rows[0];
  if(!r||!r.accepting||r.closes_at<=now()||!r[mode==='participant'?'participant_capacity':'stall_capacity'])throw fail('Pendaftaran jenis ini belum dibuka atau sudah ditutup.');
}
export async function publicEnrollment(){
  const settings=await query('SELECT * FROM event_enrollment');
  const counts=await query("SELECT event_id,mode,COUNT(*) AS total FROM event_registrations WHERE status='approved' GROUP BY event_id,mode");
  const links=await query("SELECT DISTINCT event_id,product_id FROM event_registrations WHERE status='approved' AND product_id<>''");
  return new Map(settings.map(s=>[s.event_id,{
    open:!!s.accepting&&s.closes_at>now(),closesAt:s.closes_at,
    participant:{capacity:s.participant_capacity,approved:Number(counts.find(r=>r.event_id===s.event_id&&r.mode==='participant')?.total||0)},
    stall:{capacity:s.stall_capacity,approved:Number(counts.find(r=>r.event_id===s.event_id&&r.mode==='stall')?.total||0)},
    productIds:links.filter(r=>r.event_id===s.event_id).map(r=>r.product_id)
  }]));
}

export function mountRegistrations(app,{auth,rate}){
  app.post('/api/event-registrations',async(req,res)=>{
    if(req.body.website)throw fail('Pendaftaran tidak dapat diproses.');
    const mode=req.body.mode;if(!modes.includes(mode))throw fail('Pilih jenis pendaftaran yang tersedia.');
    const d=validateApplicant(req.body);
    await rate(req,'event-submit',12,60);
    const eventId=required(req.body.eventId,'Kegiatan',1,100);
    await registrationAvailable(eventId,mode);
    const id=randomUUID(),token=randomBytes(24).toString('hex'),stamp=now();
    const cap=mode==='participant'?'participant_capacity':'stall_capacity';
    try{
      const result=await transaction([lock(eventId),{sql:`INSERT INTO event_registrations(id,event_id,mode,applicant_key,token_hash,status,data,note,product_id,attended,created_at,updated_at) SELECT ?,?,?,?,?,'pending',?,'','',0,?,? FROM event_enrollment WHERE event_id=? AND accepting=1 AND closes_at>? AND ${cap}>${countFor(mode)} RETURNING id`,args:[id,eventId,mode,applicantKey(d),hash(token),JSON.stringify(d),stamp,stamp,eventId,stamp]}]);
      if(!result[1].length)throw fail('Pendaftaran sudah ditutup atau kuota telah penuh.',409);
    }catch(e){if(e.code==='23505'||/UNIQUE constraint failed/.test(e.message))throw fail('Nama dan nomor ini sudah terdaftar untuk jenis kegiatan yang sama. Gunakan kode pendaftaran untuk mengecek status.',409);throw e;}
    res.status(201).json({id,token,status:'pending'});
  });
  app.post('/api/event-registrations/status',async(req,res)=>{
    await rate(req,'event-track',40,10);
    const r=await fromToken(req.body.token),event=await getRecord(r.event_id);
    res.json({status:r.status,note:r.note,mode:r.mode,eventId:r.event_id,title:event?.title||'Kegiatan tidak tersedia',eventStatus:event?.status==='published'?event.eventStatus:'Tidak ditampilkan',date:event?.date,updatedAt:r.updated_at,attended:!!r.attended});
  });
  app.put('/api/event-registrations/revision',async(req,res)=>{
    await rate(req,'event-revision',12,60);
    const old=await fromToken(req.body.token);
    if(old.status!=='revision')throw fail('Pengajuan ini tidak sedang meminta perbaikan.',409);
    const d=validateApplicant({...req.body,mode:old.mode});
    await registrationAvailable(old.event_id,old.mode);
    const cap=old.mode==='participant'?'participant_capacity':'stall_capacity';
    try{
      const results=await transaction([lock(old.event_id),{sql:`UPDATE event_registrations SET data=?,applicant_key=?,status='pending',note='',updated_at=? WHERE id=? AND status='revision' AND updated_at=? AND EXISTS(SELECT 1 FROM event_enrollment WHERE event_id=? AND accepting=1 AND closes_at>? AND ${cap}>${countFor(old.mode)}) RETURNING id`,args:[JSON.stringify(d),applicantKey(d),now(),old.id,old.updated_at,old.event_id,now()]}]);
      if(!results[1].length)throw fail('Pengajuan berubah, pendaftaran ditutup, atau kuota sudah penuh. Periksa status terbaru.',409);
    }catch(e){if(e.code==='23505'||/UNIQUE constraint failed/.test(e.message))throw fail('Nama dan nomor ini sudah dipakai pada pendaftaran lain.',409);throw e;}
    res.json({status:'pending',token:req.body.token.trim()});
  });
  app.get('/api/admin/event-registrations',auth,async(req,res)=>{
    const rows=await query('SELECT * FROM event_registrations ORDER BY created_at DESC');
    res.json(rows.map(rowData));
  });
  app.put('/api/admin/event-registrations/:id',auth,async(req,res)=>{
    const rows=await query('SELECT * FROM event_registrations WHERE id=?',[req.params.id]),old=rows[0];
    if(!old)throw fail('Pendaftaran tidak ditemukan.',404);
    const status=req.body.status;if(!statuses.includes(status))throw fail('Status pendaftaran tidak valid.');
    if(req.body.updatedAt!==old.updated_at)throw fail('Pengajuan telah berubah. Muat ulang sebelum menyimpan.',409);
    const note=typeof req.body.note==='string'?req.body.note.trim().slice(0,2000):'';
    if(['revision','rejected','cancelled'].includes(status)&&!note)throw fail('Catatan perbaikan, penolakan, atau pembatalan wajib diisi.');
    let productId=typeof req.body.productId==='string'?req.body.productId:'';
    if(old.mode!=='stall')productId='';
    if(productId){const p=await getRecord(productId);if(!p||p.kind!=='product'||p.status!=='published')throw fail('Pilih produk Lapak Desa yang sudah terbit.');}
    const stamp=now();
    const results=await transaction([lock(old.event_id),{sql:`UPDATE event_registrations SET status=?,note=?,product_id=?,attended=?,updated_at=? WHERE id=? AND updated_at=? AND (?<>'approved' OR status='approved' OR EXISTS(SELECT 1 FROM event_enrollment WHERE event_id=? AND active=1 AND ends_at>? AND ${capacity}>${countFor(old.mode)})) RETURNING *`,args:[status,note,productId,status==='approved'&&req.body.attended===true?1:0,stamp,old.id,old.updated_at,status,old.event_id,stamp]}]);
    if(!results[1].length)throw fail('Persetujuan gagal: kuota penuh, kegiatan tidak aktif/sudah selesai, atau pengajuan telah berubah. Muat ulang untuk memeriksa.',409);
    res.json(rowData(results[1][0]));
  });
  app.delete('/api/admin/event-registrations/:id',auth,async(req,res)=>{
    const result=await query("DELETE FROM event_registrations WHERE id=? AND status IN ('rejected','cancelled') RETURNING id",[req.params.id]);
    if(!result.length)throw fail('Hanya pendaftaran yang ditolak atau dibatalkan yang dapat dihapus.',409);
    res.json({ok:true});
  });
}

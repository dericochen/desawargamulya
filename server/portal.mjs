// Portal Digital Desa API: generic admin CRUD for schema tables, public portal data,
// complaints with TIK-xxx tickets, and token-based citizen ↔ admin chat.
import {randomBytes,randomUUID,randomInt} from 'node:crypto';
import {query,transaction,hash} from './db.mjs';
import {tables,complaintCategories,complaintStatuses,chatCategories,ticketLabel,MAX_IMAGES} from './portal-schema.mjs';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const now=()=>new Date().toISOString();
// Trims, removes control characters (newlines kept), and keeps one extra char so over-long input is rejected, not silently cut.
const str=(v,max)=>typeof v==='string'||typeof v==='number'?String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim().slice(0,max+1):'';
const dateSafe=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const optionValues=f=>f.options.map(o=>Array.isArray(o)?o[0]:o);
const owner=(table,id)=>`portal:${table}:${id}`;
const statusCodes=complaintStatuses.map(s=>s[0]);
const def=table=>{const d=tables[table];if(!d)throw fail('Data tidak dikenal.',404);return d;};

// Neon returns BIGINT/COUNT as strings; normalize numeric columns so both databases give the same JSON.
export const parseList=v=>{if(Array.isArray(v))return v;try{const a=JSON.parse(v||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'):[];}catch{return [];}};
// Accepts either a combined list (primary first) or primary + extras and returns up to MAX_IMAGES validated values.
export function imageList(primary,more,imageSafe,label='Foto'){
  const list=[primary,...(Array.isArray(more)?more:[])].filter(v=>typeof v==='string'&&v.trim());
  if(list.length>MAX_IMAGES)throw fail(`${label} maksimal ${MAX_IMAGES} foto.`);
  return list.map(v=>imageSafe(v));
}
function normalize(table,row){
  if(!row)return row;const out={...row};
  for(const [k,f] of Object.entries(tables[table].fields))if(['int','bigint','bool'].includes(f.type))out[k]=Number(out[k]||0);else if(f.type==='num'&&out[k]!==null)out[k]=Number(out[k]);else if(f.type==='image')out[k+'_more']=parseList(out[k+'_more']);
  return out;
}
const select=async(table,where='',args=[])=>(await query(`SELECT * FROM ${table}${where?' WHERE '+where:''} ORDER BY ${tables[table].order}`,args)).map(r=>normalize(table,r));
const byId=async(table,id)=>(await select(table,'id=?',[id]))[0];

export function normalizePhone(value){
  const raw=str(value,25).replace(/[\s()-]/g,'');
  if(!/^(?:\+62|62|0)8\d{7,11}$/.test(raw))throw fail('Isi nomor WhatsApp Indonesia yang valid, misalnya 081234567890.');
  return raw.replace(/^\+/,'').replace(/^0/,'62');
}
const required=(value,label,min,max)=>{const s=str(value,max);if(s.length<min||s.length>max)throw fail(`${label} wajib diisi (${min}–${max} karakter).`);return s;};
const maskName=name=>name.split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()+'*'.repeat(Math.max(2,w.length-1))).join(' ');

async function uniqueSlug(table,name,id){
  const base=name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-').slice(0,80)||'item';
  let slug=base;for(let n=2;(await query(`SELECT id FROM ${table} WHERE slug=? AND id<>?`,[slug,id])).length;n++)slug=base+'-'+n;
  return slug;
}

async function validateRow(table,input,old,id,{imageSafe,persistImage}){
  const d=def(table),out={};
  for(const [k,f] of Object.entries(d.fields)){
    const v=Object.prototype.hasOwnProperty.call(input,k)?input[k]:old?old[k]:f.def;
    switch(f.type){
      case 'slug':break;
      case 'text':{const s=str(v,f.max);if(s.length>f.max)throw fail(`${f.label} maksimal ${f.max} karakter.`);if(f.required&&s.length<(f.min||1))throw fail(`${f.label} wajib diisi${(f.min||1)>1?` (minimal ${f.min} karakter)`:''}.`);if(s&&f.pattern&&!f.pattern.test(s))throw fail(f.patternMessage);out[k]=s;break;}
      case 'int':case 'bigint':{const n=v===''||v==null?(f.def??0):Number(v);if(!Number.isInteger(n)||n<f.min||n>f.max)throw fail(`${f.label} harus berupa angka bulat ${f.min}–${new Intl.NumberFormat('id-ID').format(f.max)}.`);out[k]=n;break;}
      case 'num':{if(v===''||v==null){if(f.required)throw fail(`${f.label} wajib diisi.`);out[k]=null;break;}const n=Number(v);if(!Number.isFinite(n)||n<f.min||n>f.max)throw fail(`${f.label} tidak valid.`);out[k]=n;break;}
      case 'bool':out[k]=v===true||v===1||v==='1'||v==='true'?1:0;break;
      case 'enum':{const opts=optionValues(f),s=v==null||v===''?(f.def??opts[0]):String(v);if(!opts.includes(s))throw fail(`${f.label} tidak valid.`);out[k]=s;break;}
      case 'date':{const s=str(v,10);if(s&&!dateSafe(s))throw fail(`${f.label} tidak valid.`);if(f.required&&!s)throw fail(`${f.label} wajib diisi.`);out[k]=s;break;}
      case 'phone':{const s=str(v,25);if(s&&!/^\+?[\d\s().-]{3,25}$/.test(s))throw fail(`${f.label} hanya boleh berisi angka, spasi, tanda kurung, atau tanda hubung.`);out[k]=s;break;}
      case 'image':{
        const has=o=>Object.prototype.hasOwnProperty.call(input,o);
        const list=imageList(typeof v==='string'?v:'',has(k+'_more')?input[k+'_more']:old?old[k+'_more']:[],imageSafe,f.label);
        if(f.required&&!list.length)throw fail(`${f.label} wajib diunggah.`);
        out[k]=list[0]||'';out[k+'_more']=list.slice(1);break;}
      case 'ref':{const s=typeof v==='string'?v.trim():'';if(!s){if(f.required)throw fail(`${f.label} wajib dipilih.`);out[k]=null;break;}
        if(f.table===table&&s===id)throw fail(`${f.label} tidak boleh menunjuk dirinya sendiri.`);
        if(!(await query(`SELECT id FROM ${f.table} WHERE id=?`,[s])).length)throw fail(`${f.label} tidak ditemukan.`);out[k]=s;break;}
    }
  }
  if(d.parent&&old)out[d.parent.key]=old[d.parent.key];
  d.normalize?.(out);const message=d.check?.(out);if(message)throw fail(message);
  if(d.fields.slug)out.slug=await uniqueSlug(table,out.name,id);
  for(const [k,f] of Object.entries(d.fields))if(f.type==='image'){
    if(out[k])out[k]=await persistImage(out[k],owner(table,id));
    out[k+'_more']=JSON.stringify(await Promise.all(out[k+'_more'].map(v=>persistImage(v,owner(table,id)))));
  }
  return out;
}
export async function pruneMedia(ownerKey,values){
  const keep=values.filter(v=>typeof v==='string'&&v.startsWith('/api/media/')).map(v=>v.split('/').pop());
  if(!keep.length)return query('DELETE FROM media WHERE record_id=?',[ownerKey]);
  return query(`DELETE FROM media WHERE record_id=? AND id NOT IN (${keep.map(()=>'?').join(',')})`,[ownerKey,...keep]);
}
const imageValues=(table,row)=>Object.entries(tables[table].fields).filter(([,f])=>f.type==='image').flatMap(([k])=>[row[k],...parseList(row[k+'_more'])]);

// Media stored for portal rows is public only when the row (and its parent) is publicly visible.
export async function portalMediaVisible(recordId){
  const [,table,id]=recordId.split(':');if(!tables[table])return false;
  const d=tables[table],row=await byId(table,id);
  if(!row||d.privateRows||(d.publicFlag&&!row[d.publicFlag]))return false;
  if(['tourism_stays','tourism_guides'].includes(table)&&row.data_status!=='demo'&&!row.contact_consent)return false;
  return d.parent?portalMediaVisible(owner(d.parent.table,row[d.parent.key])):true;
}

export async function publicPortal(){
  const active=t=>select(t,`${tables[t].publicFlag}=1`);
  const [places,gallery,facilities,faqs,nodes,options,emergency,areas,units,projects,updates,programs,docs,stats]=await Promise.all([
    active('tourism_places'),select('tourism_gallery'),active('public_facilities'),active('faqs'),active('chatbot_nodes'),select('chatbot_options'),
    active('emergency_contacts'),active('village_areas'),active('neighborhood_units'),active('development_projects'),select('project_updates'),
    active('aid_programs'),select('aid_documentation'),
    query("SELECT program_id,status,COUNT(*) AS total FROM aid_recipients WHERE is_active=1 GROUP BY program_id,status")
  ]);
  const areaName=id=>areas.find(a=>a.id===id)?.name||'',nodeIds=new Set(nodes.map(n=>n.id));
  const directory=rows=>rows.filter(r=>r.data_status==='demo'||r.contact_consent).map(r=>{
    const {contact_consent,location_consent,address,submission_status,...item}=r;
    if(!contact_consent||r.data_status==='demo')item.phone='';
    if(!location_consent||r.data_status==='demo'){item.latitude=null;item.longitude=null;}
    return item;
  });
  const [stays,guides]=await Promise.all([active('tourism_stays'),active('tourism_guides')]);
  return {
    stays:directory(stays),guides:directory(guides),
    tourism:places.map(p=>({...p,gallery:gallery.filter(g=>g.tourism_id===p.id)})),
    facilities,faqs,emergency,
    chatbot:{nodes,options:options.filter(o=>nodeIds.has(o.node_id))},
    areas:areas.map(a=>({id:a.id,name:a.name,units:units.filter(u=>u.village_area_id===a.id).map(u=>({id:u.id,rt:u.rt,rw:u.rw}))})),
    projects:projects.map(p=>({...p,area_name:areaName(p.village_area_id),updates:updates.filter(u=>u.project_id===p.id)})),
    aid:programs.map(p=>({...p,documentation:docs.filter(x=>x.program_id===p.id),distribution:Object.fromEntries(stats.filter(s=>s.program_id===p.id).map(s=>[s.status,Number(s.total)]))}))
  };
}

export function mountPortal(app,{auth,rate,imageSafe,persistImage}){
  app.get('/api/portal',async(req,res)=>res.json(await publicPortal()));
  app.get('/api/portal/aid/:id/recipients',async(req,res)=>{
    const program=await byId('aid_programs',req.params.id);
    if(!program||!program.is_published||!program.show_recipients)throw fail('Daftar penerima tidak dipublikasikan.',404);
    const page=Math.max(1,Math.min(10000,Number.parseInt(req.query.page)||1)),size=20,where=['r.program_id=?','r.is_active=1'],args=[program.id];
    if(typeof req.query.area==='string'&&req.query.area){where.push('r.village_area_id=?');args.push(req.query.area);}
    if(typeof req.query.status==='string'&&req.query.status){where.push('r.status=?');args.push(req.query.status);}
    const total=Number((await query(`SELECT COUNT(*) AS total FROM aid_recipients r WHERE ${where.join(' AND ')}`,args))[0].total);
    const rows=await query(`SELECT r.name,r.status,a.name AS area FROM aid_recipients r LEFT JOIN village_areas a ON a.id=r.village_area_id WHERE ${where.join(' AND ')} ORDER BY r.name LIMIT ${size} OFFSET ${(page-1)*size}`,args);
    res.json({items:rows.map(r=>({name:maskName(r.name),area:r.area||'—',status:r.status})),total,page,pages:Math.max(1,Math.ceil(total/size))});
  });

  // ---------- Generic admin CRUD ----------
  app.get('/api/admin/portal/:table',auth,async(req,res)=>{
    const d=def(req.params.table),key=d.parent?.key;
    const rows=key&&typeof req.query[key]==='string'?await select(req.params.table,`${key}=?`,[req.query[key]]):await select(req.params.table);
    res.json(rows.slice(0,5000));
  });
  app.post('/api/admin/portal/aid_recipients/import',auth,async(req,res)=>{
    const program=await byId('aid_programs',str(req.body.program_id,100));if(!program)throw fail('Pilih program bantuan.');
    const areas=await select('village_areas'),lines=str(req.body.rows,200000).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!lines.length||lines.length>2000)throw fail('Isi 1–2.000 baris data penerima.');
    const statuses=optionValues(tables.aid_recipients.fields.status),stamp=now(),statements=[];
    lines.forEach((line,i)=>{
      const [name,areaText='',statusText='']=line.split(/[;\t]/).map(s=>s.trim());
      if(!name||name.length<2||name.length>120||/\d{8,}/.test(name))throw fail(`Baris ${i+1}: nama tidak valid (jangan sertakan NIK/KK).`);
      const area=areaText?areas.find(a=>a.name.toLowerCase()===areaText.toLowerCase()):null;
      if(areaText&&!area)throw fail(`Baris ${i+1}: dusun “${areaText}” belum terdaftar di menu Wilayah.`);
      const status=statusText?statuses.find(s=>s.toLowerCase()===statusText.toLowerCase()):statuses[0];
      if(!status)throw fail(`Baris ${i+1}: status harus salah satu dari ${statuses.join(', ')}.`);
      statements.push({sql:'INSERT INTO aid_recipients (id,program_id,name,village_area_id,status,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)',args:[randomUUID(),program.id,name,area?.id||null,status,stamp,stamp]});
    });
    await transaction(statements);res.status(201).json({imported:statements.length});
  });
  app.post('/api/admin/portal/:table',auth,async(req,res)=>{
    const table=req.params.table;def(table);const id=randomUUID(),stamp=now();
    const row=await validateRow(table,req.body,null,id,{imageSafe,persistImage});
    const cols=['id',...Object.keys(row),'created_at','updated_at'];
    const saved=await query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')}) RETURNING *`,[id,...Object.values(row),stamp,stamp]);
    res.status(201).json(normalize(table,saved[0]));
  });
  app.put('/api/admin/portal/:table/:id',auth,async(req,res)=>{
    const table=req.params.table;def(table);const old=await byId(table,req.params.id);if(!old)throw fail('Data tidak ditemukan.',404);
    if(req.body.updated_at&&req.body.updated_at!==old.updated_at)throw fail('Data telah diubah di tempat lain. Muat ulang sebelum menyimpan.',409);
    const row=await validateRow(table,req.body,old,old.id,{imageSafe,persistImage});
    const saved=await query(`UPDATE ${table} SET ${Object.keys(row).map(k=>k+'=?').join(',')},updated_at=? WHERE id=? RETURNING *`,[...Object.values(row),now(),old.id]);
    await pruneMedia(owner(table,old.id),imageValues(table,row));
    res.json(normalize(table,saved[0]));
  });
  app.post('/api/admin/portal/:table/:id/move',auth,async(req,res)=>{
    const table=req.params.table,d=def(table);if(!d.fields.sort_order)throw fail('Data ini tidak memiliki urutan.');
    const row=await byId(table,req.params.id);if(!row)throw fail('Data tidak ditemukan.',404);
    const key=d.parent?.key,siblings=key?await select(table,`${key}=?`,[row[key]]):await select(table);
    const list=[...siblings].sort((a,b)=>a.sort_order-b.sort_order),i=list.findIndex(r=>r.id===row.id),j=i+(req.body.direction===-1?-1:1);
    if(j<0||j>=list.length)return res.json({ok:true});
    [list[i],list[j]]=[list[j],list[i]];
    await transaction(list.map((r,n)=>({sql:`UPDATE ${table} SET sort_order=? WHERE id=?`,args:[(n+1)*10,r.id]})));
    res.json({ok:true});
  });
  app.delete('/api/admin/portal/:table/:id',auth,async(req,res)=>{
    const table=req.params.table,d=def(table),row=await byId(table,req.params.id);if(!row)throw fail('Data tidak ditemukan.',404);
    if(table==='chatbot_nodes'&&row.action_type==='start'&&(await query("SELECT id FROM chatbot_nodes WHERE action_type='start'")).length<2)throw fail('Menu utama chatbot tidak dapat dihapus. Ubah isinya saja.',409);
    // Children are removed by ON DELETE CASCADE; collect their media owners first so uploaded files are cleaned up too.
    const owners=[owner(table,row.id)];
    for(const c of d.children||[])for(const r of await query(`SELECT id FROM ${c.table} WHERE ${c.key}=?`,[row.id]))owners.push(owner(c.table,r.id));
    await query(`DELETE FROM ${table} WHERE id=?`,[row.id]);
    await transaction(owners.map(o=>({sql:'DELETE FROM media WHERE record_id=?',args:[o]})));
    res.json({ok:true});
  });

  // ---------- Public tourism submissions (penginapan / pemandu dari warga) ----------
  // Residents submit a villa/house or a guide service. Rows arrive hidden (is_active 0, submission_status 'pending')
  // and must be reviewed and published by an admin; the full address is kept out of the public payload.
  app.post('/api/tourism/submissions',async(req,res)=>{
    const b=req.body||{};if(b.website)throw fail('Pengajuan tidak dapat diproses.');
    const kind=b.kind;if(kind!=='stay'&&kind!=='guide')throw fail('Jenis pengajuan tidak dikenal.');
    const table=kind==='stay'?'tourism_stays':'tourism_guides',fields=tables[table].fields;
    const name=required(b.name,'Nama layanan',3,150),owner_name=required(b.owner_name,'Nama pemilik / pemandu',3,120);
    const address=required(b.address,'Alamat lengkap',10,300),area=required(b.area,'Wilayah yang ditampilkan',3,200);
    const short_description=required(b.short_description,'Ringkasan',10,300),phone=normalizePhone(b.phone);
    const photos=Array.isArray(b.images)?b.images:[];
    if(photos.length<1||photos.length>MAX_IMAGES)throw fail(`Unggah 1–${MAX_IMAGES} foto layanan.`);
    if(photos.some(p=>typeof p!=='string'||!p.startsWith('data:image/')))throw fail('Unggah foto dari perangkat Anda (JPG, PNG, atau WebP), bukan tautan.');
    const capacityRaw=Number(b.capacity);
    if(!Number.isInteger(capacityRaw)||capacityRaw<1||capacityRaw>100)throw fail('Kapasitas harus berupa angka bulat 1–100.');
    if(b.consent!==true)throw fail('Centang pernyataan persetujuan sebelum mengirim.');
    const description=str(b.description,6000);if(description.length>6000)throw fail('Deskripsi lengkap maksimal 6.000 karakter.');
    let price=null;
    if(b.price!==''&&b.price!=null){const n=Number(b.price);if(!Number.isInteger(n)||n<0||n>100000000)throw fail('Tarif harus berupa angka bulat 0–100.000.000.');price=n;}
    const input={name,owner_name,address,area,short_description,description,phone,capacity:capacityRaw,price,
      is_active:false,data_status:'perlu_verifikasi',submission_status:'pending',contact_consent:true,location_consent:false,
      latitude:null,longitude:null,availability:'inquiry',verified_on:'',sort_order:100,
      image_credit:'Foto dari pemilik, dikirim melalui formulir pengajuan website.',cover_image:photos[0]||'',cover_image_more:photos.slice(1)};
    if(kind==='stay'){
      const stayTypes=optionValues(fields.stay_type);const stay_type=str(b.stay_type,80);
      if(!stayTypes.includes(stay_type))throw fail('Pilih jenis penginapan.');
      const bedrooms=Number(b.bedrooms);if(!Number.isInteger(bedrooms)||bedrooms<1||bedrooms>50)throw fail('Kamar tidur harus berupa angka bulat 1–50.');
      const amenities=str(b.amenities,2000);if(amenities.length>2000)throw fail('Fasilitas maksimal 2.000 karakter.');
      const check_in=str(b.check_in,80),check_out=str(b.check_out,80);
      if(check_in.length>80||check_out.length>80)throw fail('Jam masuk / keluar maksimal 80 karakter.');
      Object.assign(input,{stay_type,bedrooms,amenities,check_in,check_out});
    }else{
      const languages=required(b.languages,'Bahasa layanan',3,200),specialties=required(b.specialties,'Kegiatan / keahlian',3,2000);
      const rateUnits=optionValues(fields.rate_unit),rate_unit=b.rate_unit==null||b.rate_unit===''?'per kelompok':str(b.rate_unit,40);
      if(!rateUnits.includes(rate_unit))throw fail('Pilih satuan tarif.');
      let duration_hours=null;
      if(b.duration_hours!==''&&b.duration_hours!=null){const n=Number(b.duration_hours);if(!Number.isFinite(n)||n<0.5||n>72)throw fail('Durasi layanan harus 0,5–72 jam.');duration_hours=n;}
      Object.assign(input,{languages,specialties,duration_hours,rate_unit});
    }
    await rate(req,'tourism-submit',5,60);
    const id=randomUUID(),stamp=now();
    const row=await validateRow(table,input,null,id,{imageSafe,persistImage});
    const cols=['id',...Object.keys(row),'created_at','updated_at'];
    await query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`,[id,...Object.values(row),stamp,stamp]);
    res.status(201).json({ok:true,message:'Pengajuan diterima. Pengelola desa akan memeriksa data dan menghubungi Anda melalui WhatsApp sebelum layanan ditampilkan.'});
  });
  // ---------- Complaints (pengaduan) ----------
  // Ticket code = sequential number + 3 random characters, e.g. TIK-004-K7Q. One string to copy and paste;
  // the random part (stored only as a hash) stops people from guessing other residents' tickets.
  const codeChars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to avoid typing mistakes
  const newPin=()=>Array.from({length:3},()=>codeChars[randomInt(codeChars.length)]).join('');
  const pinHash=(id,pin)=>hash('complaint-pin:'+id+':'+pin);
  const ticketCode=(no,pin)=>ticketLabel(no)+'-'+pin;
  async function complaintByTicket(body){
    // Accepts "TIK-004-K7Q" (also lower case / without dashes). Older tickets: TIK-001 + 6-digit PIN.
    const raw=(str(body?.code??body?.ticket,30)+(body?.pin?'-'+str(body.pin,10):'')).toUpperCase().replace(/[\s_.]/g,'');
    const m=raw.match(/^(?:TIK)?-?(\d{1,7})-?([A-Z0-9]{3}|\d{6})$/);
    const rows=m?await query('SELECT * FROM complaints WHERE ticket_no=?',[Number(m[1])]):[];
    const c=rows[0];
    if(c&&!c.pin_hash)throw fail('Pengaduan ini dibuat sebelum kode tiket diberlakukan. Hubungi Kantor Desa untuk mendapatkan kode baru.',403);
    if(!c||!m||pinHash(c.id,m[2])!==c.pin_hash)throw fail('Kode tiket tidak ditemukan. Salin lengkap kode Anda, misalnya TIK-023-K7Q.',404);
    return c;
  }
  app.post('/api/complaints',async(req,res)=>{
    const b=req.body||{};if(b.website)throw fail('Pengaduan tidak dapat diproses.');
    const name=required(b.name,'Nama',3,120),phone=normalizePhone(b.phone);
    const areas=await select('village_areas','is_active=1');let area=null;
    if(areas.length){area=areas.find(a=>a.id===b.village_area_id);if(!area)throw fail('Pilih dusun / wilayah dari daftar.');}
    const rtRw={};for(const k of ['rt','rw']){const v=str(b[k],3);if(v&&!/^\d{1,3}$/.test(v))throw fail(`${k.toUpperCase()} berupa angka 1–3 digit.`);rtRw[k]=v?v.padStart(3,'0'):'';}
    if(area&&rtRw.rt){const units=await select('neighborhood_units','village_area_id=? AND is_active=1',[area.id]);if(units.length&&!units.some(u=>u.rt===rtRw.rt&&u.rw===rtRw.rw))throw fail('RT/RW tidak sesuai dengan dusun yang dipilih.');}
    if(!complaintCategories.includes(b.category))throw fail('Pilih kategori pengaduan.');
    const title=required(b.title,'Judul pengaduan',5,150),body=required(b.body,'Isi pengaduan',10,3000),location=required(b.location,'Lokasi kejadian',3,300);
    if(b.consent!==true)throw fail('Centang pernyataan kebenaran informasi sebelum mengirim.');
    const photos=Array.isArray(b.images)?b.images:b.image?[b.image]:[];
    if(photos.length>MAX_IMAGES)throw fail(`Foto pengaduan maksimal ${MAX_IMAGES}.`);
    if(photos.some(p=>typeof p!=='string'||!p.startsWith('data:image/')))throw fail('Unggah foto berformat JPG, PNG, atau WebP.');
    const images=photos.map(p=>imageSafe(p));
    await rate(req,'complaint',6,60);
    const id=randomUUID(),stamp=now(),pin=newPin();
    const counter=await query("UPDATE counters SET value=value+1 WHERE name='complaint' RETURNING value");
    const ticketNo=Number(counter[0].value);
    const stored=[];for(const img of images)stored.push(await persistImage(img,'complaint:'+id));
    await transaction([
      {sql:'INSERT INTO complaints (id,ticket_no,name,phone,village_area_id,area_name,rt,rw,category,title,body,location,image,image_more,pin_hash,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',args:[id,ticketNo,name,phone,area?.id||null,area?.name||'',rtRw.rt,rtRw.rw,b.category,title,body,location,stored[0]||'',JSON.stringify(stored.slice(1)),pinHash(id,pin),'baru',stamp,stamp]},
      {sql:'INSERT INTO complaint_updates (id,complaint_id,status,note,created_at) VALUES (?,?,?,?,?)',args:[randomUUID(),id,'baru','Pengaduan diterima dan menunggu verifikasi petugas.',stamp]}
    ]);
    res.status(201).json({ticket:ticketLabel(ticketNo),code:ticketCode(ticketNo,pin),status:'baru'});
  });
  app.post('/api/complaints/status',async(req,res)=>{
    await rate(req,'complaint-track',20,10);
    const c=await complaintByTicket(req.body),updates=await query('SELECT status,note,created_at FROM complaint_updates WHERE complaint_id=? ORDER BY created_at',[c.id]);
    // Only non-personal fields: name, phone, description, location and photo stay with the admin.
    res.json({ticket:ticketLabel(c.ticket_no),category:c.category,area:c.area_name,status:c.status,createdAt:c.created_at,updatedAt:c.updated_at,updates,
      feedback:Number(c.feedback_rating)?{rating:Number(c.feedback_rating),note:c.feedback_note}:null,canFeedback:c.status==='selesai'&&!Number(c.feedback_rating)});
  });
  // Citizens rate how their completed complaint was handled (once per ticket).
  app.post('/api/complaints/feedback',async(req,res)=>{
    await rate(req,'complaint-feedback',10,60);
    const c=await complaintByTicket(req.body),rating=Number(req.body.rating),note=str(req.body.note,500);
    if(!Number.isInteger(rating)||rating<1||rating>5)throw fail('Pilih penilaian 1 sampai 5.');
    if(note.length>500)throw fail('Komentar maksimal 500 karakter.');
    if(c.status!=='selesai')throw fail('Penilaian dapat diberikan setelah pengaduan selesai.',409);
    const r=await query('UPDATE complaints SET feedback_rating=?,feedback_note=?,feedback_at=? WHERE id=? AND feedback_rating=0 RETURNING id',[rating,note,now(),c.id]);
    if(!r.length)throw fail('Penilaian untuk tiket ini sudah dikirim.',409);
    res.json({ok:true});
  });
  const complaintRow=({pin_hash,...c})=>({...c,ticket_no:Number(c.ticket_no),ticket:ticketLabel(c.ticket_no),image_more:parseList(c.image_more),feedback_rating:Number(c.feedback_rating||0),has_pin:!!pin_hash});
  // Admin creates a new ticket code for a resident who lost it (shown once, then only its hash is stored).
  app.post('/api/admin/complaints/:id/pin',auth,async(req,res)=>{
    const pin=newPin(),r=await query('UPDATE complaints SET pin_hash=? WHERE id=? RETURNING ticket_no',[pinHash(req.params.id,pin),req.params.id]);
    if(!r.length)throw fail('Pengaduan tidak ditemukan.',404);
    res.json({code:ticketCode(r[0].ticket_no,pin),ticket:ticketLabel(r[0].ticket_no)});
  });
  app.get('/api/admin/complaints',auth,async(req,res)=>res.json((await query('SELECT * FROM complaints ORDER BY ticket_no DESC LIMIT 2000')).map(complaintRow)));
  app.get('/api/admin/complaints/:id',auth,async(req,res)=>{
    const rows=await query('SELECT * FROM complaints WHERE id=?',[req.params.id]);if(!rows.length)throw fail('Pengaduan tidak ditemukan.',404);
    res.json({...complaintRow(rows[0]),updates:await query('SELECT * FROM complaint_updates WHERE complaint_id=? ORDER BY created_at',[req.params.id])});
  });
  app.put('/api/admin/complaints/:id',auth,async(req,res)=>{
    const rows=await query('SELECT * FROM complaints WHERE id=?',[req.params.id]),old=rows[0];if(!old)throw fail('Pengaduan tidak ditemukan.',404);
    if(req.body.updated_at!==old.updated_at)throw fail('Pengaduan telah diperbarui admin lain. Muat ulang sebelum menyimpan.',409);
    const status=req.body.status,note=str(req.body.note,1000);
    if(!statusCodes.includes(status))throw fail('Status pengaduan tidak valid.');
    if(note.length>1000)throw fail('Catatan maksimal 1.000 karakter.');
    if(status===old.status&&!note)throw fail('Ubah status atau tuliskan catatan perkembangan.');
    if(status==='ditolak'&&!note)throw fail('Alasan penolakan wajib diisi.');
    const stamp=now();
    const result=await transaction([
      {sql:'UPDATE complaints SET status=?,updated_at=? WHERE id=? AND updated_at=? RETURNING id',args:[status,stamp,old.id,old.updated_at]},
      {sql:'INSERT INTO complaint_updates (id,complaint_id,status,note,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM complaints WHERE id=? AND updated_at=?)',args:[randomUUID(),old.id,status,note,stamp,old.id,stamp]}
    ]);
    if(!result[0].length)throw fail('Pengaduan telah berubah. Muat ulang sebelum menyimpan.',409);
    res.json({ok:true,updated_at:stamp});
  });
  app.delete('/api/admin/complaints/:id',auth,async(req,res)=>{
    const r=await query('DELETE FROM complaints WHERE id=? RETURNING id',[req.params.id]);if(!r.length)throw fail('Pengaduan tidak ditemukan.',404);
    await query('DELETE FROM media WHERE record_id=?',['complaint:'+req.params.id]);res.json({ok:true});
  });

  // ---------- Live chat (warga ↔ admin) ----------
  const conversation=async token=>{
    if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))throw fail('Percakapan tidak ditemukan.',404);
    const rows=await query('SELECT * FROM chat_conversations WHERE token_hash=?',[hash(token)]);if(!rows.length)throw fail('Percakapan tidak ditemukan.',404);return rows[0];
  };
  const recentMessages=id=>query('SELECT * FROM (SELECT id,sender,body,created_at FROM chat_messages WHERE conversation_id=? ORDER BY created_at DESC, id DESC LIMIT 200) AS recent ORDER BY created_at, id',[id]);
  const messageBody=v=>required(v,'Pesan',1,2000);
  app.post('/api/chat/start',async(req,res)=>{
    const b=req.body||{};if(b.website)throw fail('Pesan tidak dapat diproses.');
    const name=required(b.name,'Nama',2,80),phone=b.phone?normalizePhone(b.phone):'',body=messageBody(b.message);
    if(!chatCategories.includes(b.category))throw fail('Pilih topik pertanyaan.');
    await rate(req,'chat-start',6,60);
    const id=randomUUID(),token=randomBytes(24).toString('hex'),stamp=now();
    await transaction([
      {sql:'INSERT INTO chat_conversations (id,token_hash,name,phone,category,status,admin_read_at,citizen_read_at,last_message_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',args:[id,hash(token),name,phone,b.category,'open','',stamp,stamp,stamp,stamp]},
      {sql:'INSERT INTO chat_messages (id,conversation_id,sender,body,created_at) VALUES (?,?,?,?,?)',args:[randomUUID(),id,'citizen',body,stamp]}
    ]);
    res.status(201).json({token});
  });
  app.post('/api/chat/thread',async(req,res)=>{
    await rate(req,'chat-poll',400,10);
    const c=await conversation(req.body?.token),messages=await recentMessages(c.id);
    await query('UPDATE chat_conversations SET citizen_read_at=? WHERE id=?',[now(),c.id]);
    res.json({name:c.name,category:c.category,status:c.status,messages,unread:messages.filter(m=>m.sender==='admin'&&m.created_at>c.citizen_read_at).length});
  });
  app.post('/api/chat/send',async(req,res)=>{
    await rate(req,'chat-send',40,10);
    const c=await conversation(req.body?.token),body=messageBody(req.body.body),stamp=now();
    await transaction([
      {sql:'INSERT INTO chat_messages (id,conversation_id,sender,body,created_at) VALUES (?,?,?,?,?)',args:[randomUUID(),c.id,'citizen',body,stamp]},
      {sql:"UPDATE chat_conversations SET status='open',last_message_at=?,updated_at=?,citizen_read_at=? WHERE id=?",args:[stamp,stamp,stamp,c.id]}
    ]);
    res.status(201).json({ok:true});
  });
  app.get('/api/admin/chats',auth,async(req,res)=>{
    const rows=await query(`SELECT c.id,c.name,c.phone,c.category,c.status,c.last_message_at,c.created_at,
      (SELECT body FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
      (SELECT sender FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
      (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id=c.id AND m.sender='citizen' AND m.created_at>c.admin_read_at) AS unread
      FROM chat_conversations c ORDER BY c.last_message_at DESC LIMIT 300`);
    res.json(rows.map(r=>({...r,unread:Number(r.unread)})));
  });
  const adminConversation=async id=>{const rows=await query('SELECT id,name,phone,category,status,created_at,last_message_at FROM chat_conversations WHERE id=?',[id]);if(!rows.length)throw fail('Percakapan tidak ditemukan.',404);return rows[0];};
  app.get('/api/admin/chats/:id',auth,async(req,res)=>{
    const c=await adminConversation(req.params.id),messages=await recentMessages(c.id);
    await query('UPDATE chat_conversations SET admin_read_at=? WHERE id=?',[now(),c.id]);res.json({...c,messages});
  });
  app.post('/api/admin/chats/:id/messages',auth,async(req,res)=>{
    const c=await adminConversation(req.params.id),body=messageBody(req.body.body),stamp=now();
    await transaction([
      {sql:'INSERT INTO chat_messages (id,conversation_id,sender,body,created_at) VALUES (?,?,?,?,?)',args:[randomUUID(),c.id,'admin',body,stamp]},
      {sql:'UPDATE chat_conversations SET last_message_at=?,updated_at=?,admin_read_at=? WHERE id=?',args:[stamp,stamp,stamp,c.id]}
    ]);
    res.status(201).json({ok:true});
  });
  app.put('/api/admin/chats/:id',auth,async(req,res)=>{
    const c=await adminConversation(req.params.id);
    const status=req.body.status??c.status,category=req.body.category??c.category;
    if(!['open','closed'].includes(status))throw fail('Status percakapan tidak valid.');
    if(!chatCategories.includes(category))throw fail('Kategori percakapan tidak valid.');
    await query('UPDATE chat_conversations SET status=?,category=?,updated_at=? WHERE id=?',[status,category,now(),c.id]);res.json({ok:true});
  });
  app.delete('/api/admin/chats/:id',auth,async(req,res)=>{await adminConversation(req.params.id);await query('DELETE FROM chat_conversations WHERE id=?',[req.params.id]);res.json({ok:true});});

  // ---------- Dashboard summary ----------
  app.get('/api/admin/summary',auth,async(req,res)=>{
    const count=async(sql,args=[])=>Number((await query(sql,args))[0].total);
    const [byStatus,unread,tourism,projects,aid,gallery,latestComplaints,media,byCategory,feedback,submitStays,submitGuides]=await Promise.all([
      query('SELECT status,COUNT(*) AS total FROM complaints GROUP BY status'),
      count("SELECT COUNT(*) AS total FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id WHERE m.sender='citizen' AND m.created_at>c.admin_read_at"),
      count('SELECT COUNT(*) AS total FROM tourism_places WHERE is_active=1'),
      count("SELECT COUNT(*) AS total FROM development_projects WHERE is_published=1 AND status IN ('Direncanakan','Berjalan')"),
      count("SELECT COUNT(*) AS total FROM aid_programs WHERE is_published=1 AND status<>'Selesai'"),
      count("SELECT COUNT(*) AS total FROM records WHERE kind='gallery' AND status='published'"),
      query('SELECT id,ticket_no,name,category,title,status,created_at FROM complaints ORDER BY ticket_no DESC LIMIT 5'),
      count('SELECT COALESCE(SUM(LENGTH(content)),0) AS total FROM media'),
      query('SELECT category,COUNT(*) AS total FROM complaints GROUP BY category ORDER BY COUNT(*) DESC'),
      query('SELECT COUNT(*) AS total,COALESCE(AVG(feedback_rating),0) AS average FROM complaints WHERE feedback_rating>0'),
      count("SELECT COUNT(*) AS total FROM tourism_stays WHERE submission_status='pending'"),
      count("SELECT COUNT(*) AS total FROM tourism_guides WHERE submission_status='pending'")
    ]);
    const complaints=Object.fromEntries(statusCodes.map(s=>[s,Number(byStatus.find(r=>r.status===s)?.total||0)]));
    res.json({complaints,unread,tourism,projects,aid,gallery,latestComplaints:latestComplaints.map(complaintRow),byCategory:byCategory.map(r=>({category:r.category,total:Number(r.total)})),feedback:{total:Number(feedback[0].total),average:Math.round(Number(feedback[0].average)*10)/10},storage:{usedMB:Math.round(media/1048576*10)/10,limitMB:Number(process.env.MEDIA_LIMIT_MB||300)},tourismSubmissions:{stays:submitStays,guides:submitGuides}});
  });
}

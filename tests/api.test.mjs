import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {checkRegistrations} from './registrations.mjs';
import {checkDirectory} from './directory.mjs';
import {checkPortal} from './portal.mjs';

const testRoot=fileURLToPath(new URL('../.test-data/',import.meta.url));
fs.mkdirSync(testRoot,{recursive:true});
process.env.DATA_DIR=fs.mkdtempSync(path.join(testRoot,'run-'));
process.env.ADMIN_EMAIL='test-admin@example.invalid';
process.env.ADMIN_PASSWORD=randomBytes(24).toString('hex');
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const {default:app}=await import('../server/app.mjs');
const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
let cookie='';
async function request(url,{method='GET',body,admin=false,headers={}}={}){
  const r=await fetch(base+'/api'+url,{method,headers:{'Content-Type':'application/json',...(admin?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:r.headers.get('Content-Type')?.includes('application/json')?await r.json():await r.arrayBuffer(),headers:r.headers};
}
test('Public content, moderation, image privacy and CMS persistence',async t=>{
 try{
  await t.test('Public seed and protected admin access',async()=>{
   const r=await request('/content');assert.equal(r.status,200);assert.equal(r.data.site.name,'Marga Mulya');assert.equal(r.data.products.length,3);assert.equal(JSON.stringify(r.data).includes('submissionToken'),false);
   assert.equal((await request('/admin/content')).status,401);
   assert.equal((await request('/login',{method:'POST',body:{},headers:{Origin:'https://unrelated.example'}})).status,403);
   assert.equal((await request('/login',{method:'POST',body:{},headers:{Origin:'null'}})).status,403);
  });
  await t.test('Login creates an HTTP-only session',async()=>{
   assert.equal((await request('/login',{method:'POST',body:{email:process.env.ADMIN_EMAIL,password:'wrong'}})).status,401);
   const r=await request('/login',{method:'POST',body:{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}});assert.equal(r.status,200);
   assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);cookie=r.headers.get('set-cookie').split(';')[0];
  });
  let submission,record;
  const product={title:'Produk uji persetujuan',category:'Pangan',description:'Produk untuk memeriksa seluruh alur moderasi.',unit:'paket',seller:'Penjual uji',area:'Dusun uji',phone:'081234567890',price:12000,consent:true,availability:'Tersedia',image:'data:image/webp;base64,'+fs.readFileSync(new URL('../public/images/rice.webp',import.meta.url)).toString('base64')};
  await t.test('Submission ignores publication attempts and stays private',async()=>{
   const r=await request('/submissions',{method:'POST',body:{...product,status:'published',featured:true}});assert.equal(r.status,201);submission=r.data;assert.equal(submission.status,'pending');
   const items=await request('/admin/content',{admin:true});record=items.data.find(x=>x.id===submission.id);assert.equal(record.status,'pending');assert.equal(record.featured,false);assert.match(record.image,/^\/api\/media\//);
   assert.equal((await request('/content')).data.products.some(x=>x.id===record.id),false);
   assert.equal((await request(record.image.slice(4))).status,404);assert.equal((await request(record.image.slice(4),{admin:true})).status,200);
   const track=await request('/submissions/status',{method:'POST',body:{token:submission.token}});assert.equal(track.data.status,'pending');assert.equal('phone'in track.data,false);
  });
  await t.test('Image ownership cannot be reused in another submission',async()=>{
   const r=await request('/submissions',{method:'POST',body:{...product,image:record.image}});assert.equal(r.status,400);
   assert.equal((await request('/submissions',{method:'POST',body:{...product,image:'https://tracker.example/pixel.png'}})).status,400);
  });
  await t.test('Event registration times follow the site time zone',async()=>{
   const date=new Date(Date.now()+20*86400000).toISOString().slice(0,10);
   const setTz=async timezone=>assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{timezone}})).status,200);
   const closesAt=async id=>(await request('/content')).data.events.find(e=>e.id===id).enrollment.closesAt;
   await setTz('Asia/Jayapura');
   const ev=await request('/admin/records',{method:'POST',admin:true,body:{kind:'event',status:'published',title:'Agenda zona waktu',category:'Umum',date,endDate:date,time:'08:00',endTime:'10:00',location:'Balai',organizer:'Panitia',description:'Uji zona waktu',eventStatus:'Terjadwal',registrationOpen:true,participantCapacity:5,stallCapacity:0,productIds:[]}});
   assert.equal(ev.status,201);
   assert.equal(await closesAt(ev.data.id),new Date(date+'T08:00:00+09:00').toISOString());
   await setTz('Asia/Jakarta');
   assert.equal(await closesAt(ev.data.id),new Date(date+'T08:00:00+07:00').toISOString());
   assert.equal((await request('/admin/records/'+ev.data.id,{method:'DELETE',admin:true})).status,200);
  });
  await t.test('Moderator can request revision with a required reason',async()=>{
   assert.equal((await request('/admin/records/'+record.id,{method:'PUT',admin:true,body:{...record,status:'revision',moderationNote:''}})).status,400);
   const r=await request('/admin/records/'+record.id,{method:'PUT',admin:true,body:{...record,status:'revision',moderationNote:'Lengkapi satuan produk.'}});assert.equal(r.status,200);record=r.data;
   const track=await request('/submissions/status',{method:'POST',body:{token:submission.token}});assert.equal(track.data.status,'revision');assert.equal(track.data.note,'Lengkapi satuan produk.');
  });
  await t.test('Approval exposes only published information and image',async()=>{
   const r=await request('/admin/records/'+record.id,{method:'PUT',admin:true,body:{...record,status:'published',moderationNote:''}});assert.equal(r.status,200);record=r.data;
   const pub=(await request('/content')).data.products.find(x=>x.id===record.id);assert.equal(pub.title,product.title);assert.equal(pub.phone,product.phone);assert.equal('submissionToken'in pub,false);assert.equal('moderationNote'in pub,false);assert.equal('privateContact'in pub,false);
   assert.equal((await request(record.image.slice(4))).status,200);
   assert.equal((await request('/submissions/status',{method:'POST',body:{token:submission.token}})).data.status,'published');
  });
  await t.test('Conflict and archive protections',async()=>{
   assert.equal((await request('/admin/records/'+record.id,{method:'PUT',admin:true,body:{...record,updatedAt:'old',status:'published'}})).status,409);
   const r=await request('/admin/records/'+record.id,{method:'PUT',admin:true,body:{...record,status:'archived'}});assert.equal(r.status,200);record=r.data;
   assert.equal((await request(record.image.slice(4))).status,404);assert.equal((await request('/content')).data.products.some(x=>x.id===record.id),false);
  });
  await t.test('CMS validates new status, dates, and persists site changes',async()=>{
   assert.equal((await request('/admin/records',{method:'POST',admin:true,body:{...product,kind:'product',status:'rejected'}})).status,400);
   assert.equal((await request('/admin/records',{method:'POST',admin:true,body:{kind:'event',title:'Tanggal salah',date:'2026-02-31',endDate:'2026-03-04',time:'08:00',endTime:'09:00',eventStatus:'Terjadwal'}})).status,400);
   assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{heroTitle:'Judul baru yang disimpan'}})).status,200);
   assert.equal((await request('/content')).data.site.heroTitle,'Judul baru yang disimpan');
   const draft=await request('/admin/records',{method:'POST',admin:true,body:{kind:'article',status:'draft',title:'Artikel draf',body:'Belum untuk pengunjung',date:'2026-09-29'}});assert.equal(draft.status,201);assert.equal((await request('/content')).data.articles.some(x=>x.id===draft.data.id),false);
  });
  await checkRegistrations(t,request);
  await checkPortal(t,request);
  await checkDirectory(t,request);
  await t.test('Delete removes media; logout revokes access',async()=>{
   assert.equal((await request('/admin/records/'+record.id,{method:'DELETE',admin:true})).status,200);assert.equal((await request(record.image.slice(4),{admin:true})).status,404);
   assert.equal((await request('/logout',{method:'POST',admin:true})).status,200);assert.equal((await request('/admin/content',{admin:true})).status,401);
  });
 }finally{
  await new Promise(resolve=>server.close(resolve));
  const {close}=await import('../server/db.mjs');close();
  fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});
 }
});

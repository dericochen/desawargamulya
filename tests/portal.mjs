import assert from 'node:assert/strict';
import fs from 'node:fs';

const photo='data:image/webp;base64,'+fs.readFileSync(new URL('../public/images/rice.webp',import.meta.url)).toString('base64');
const citizen={name:'Warga Uji',phone:'081234567890',village_area_id:'dusun-1',rt:'1',rw:'2',category:'Jalan Rusak',title:'Jalan berlubang di depan sekolah',body:'Lubang besar membahayakan pengendara motor pada malam hari.',location:'Depan SDN Margamulya',consent:true};

export async function checkPortal(t,request){
  await t.test('Portal seed is public, verified and admin-only for writes',async()=>{
    const p=(await request('/portal')).data;
    assert.equal(p.tourism.length,4);assert.ok(p.tourism.every(x=>x.ticket_information===''&&x.opening_hours===''));
    assert.ok(p.facilities.some(f=>f.name==='Polsek Mauk'&&f.category==='polisi'));
    assert.equal(p.emergency.filter(e=>e.scope==='nasional').map(e=>e.phone).join(','),'112,110,119,113');
    assert.ok(!p.emergency.some(e=>e.name==='Puskesmas Mauk'),'contacts without verified number stay hidden');
    assert.ok(p.chatbot.nodes.some(n=>n.action_type==='start'));assert.equal(p.faqs.length,6);
    assert.equal(p.areas.length,4);assert.equal(JSON.stringify(p).includes('Warga Contoh'),false,'recipient names never in portal payload');
    for(const [m,u] of [['GET','/admin/portal/faqs'],['POST','/admin/portal/faqs'],['GET','/admin/complaints'],['GET','/admin/chats'],['GET','/admin/summary']])assert.equal((await request(u,{method:m,body:m==='POST'?{question:'x'}:undefined})).status,401);
  });
  await t.test('Admin CRUD: tourism with gallery appears on map data, inactive hidden, media cleaned',async()=>{
    const bad=await request('/admin/portal/tourism_places',{method:'POST',admin:true,body:{name:'Uji',address:'Alamat',latitude:'abc',longitude:106}});assert.equal(bad.status,400);
    const r=await request('/admin/portal/tourism_places',{method:'POST',admin:true,body:{name:'Pantai Uji Coba',address:'Marga Mulya',latitude:-6.02,longitude:106.53,cover_image:photo,is_active:true}});
    assert.equal(r.status,201);assert.equal(r.data.slug,'pantai-uji-coba');assert.match(r.data.cover_image,/^\/api\/media\//);
    const g=await request('/admin/portal/tourism_gallery',{method:'POST',admin:true,body:{tourism_id:r.data.id,image_url:photo,caption:'Foto uji'}});assert.equal(g.status,201);
    let pub=(await request('/portal')).data.tourism.find(x=>x.id===r.data.id);assert.equal(pub.gallery.length,1);
    assert.equal((await request(r.data.cover_image.slice(4))).status,200);
    const off=await request('/admin/portal/tourism_places/'+r.data.id,{method:'PUT',admin:true,body:{is_active:false}});assert.equal(off.status,200);
    assert.equal((await request('/portal')).data.tourism.some(x=>x.id===r.data.id),false);
    assert.equal((await request(r.data.cover_image.slice(4))).status,404,'inactive destination photo is private');
    assert.equal((await request(g.data.image_url.slice(4))).status,404,'gallery of inactive destination is private');
    assert.equal((await request('/admin/portal/tourism_places/'+r.data.id,{method:'DELETE',admin:true})).status,200);
    assert.equal((await request('/admin/portal/tourism_gallery?tourism_id='+r.data.id,{admin:true})).data.length,0,'gallery cascades');
    assert.equal((await request(g.data.image_url.slice(4),{admin:true})).status,404,'child media removed');
  });
  await t.test('FAQ and emergency edits are reflected publicly; ordering can move',async()=>{
    const faq=await request('/admin/portal/faqs/faq-1',{method:'PUT',admin:true,body:{answer:'Jawaban baru dari admin.'}});assert.equal(faq.status,200);
    assert.equal((await request('/portal')).data.faqs.find(f=>f.id==='faq-1').answer,'Jawaban baru dari admin.');
    assert.equal((await request('/admin/portal/faqs/faq-2/move',{method:'POST',admin:true,body:{direction:-1}})).status,200);
    assert.equal((await request('/portal')).data.faqs[0].id,'faq-2');
    assert.equal((await request('/admin/portal/emergency_contacts/em-puskesmas',{method:'PUT',admin:true,body:{is_active:true}})).status,400,'active contact requires phone');
    assert.equal((await request('/admin/portal/emergency_contacts/em-polsek',{method:'PUT',admin:true,body:{phone:'(021) 5555 0000'}})).status,200);
    assert.equal((await request('/portal')).data.emergency.find(e=>e.id==='em-polsek').phone,'(021) 5555 0000');
  });
  await t.test('Area RT/RW units, chatbot validation and root protection',async()=>{
    const u=await request('/admin/portal/neighborhood_units',{method:'POST',admin:true,body:{village_area_id:'dusun-1',rt:'1',rw:'2'}});assert.equal(u.status,201);assert.equal(u.data.rt,'001');
    assert.deepEqual((await request('/portal')).data.areas.find(a=>a.id==='dusun-1').units.map(x=>x.rt+'/'+x.rw),['001/002']);
    assert.equal((await request('/admin/portal/chatbot_options',{method:'POST',admin:true,body:{node_id:'bot-root',option_number:8,label:'Tautan luar',action:'link',action_value:'https://phish.example'}})).status,400);
    assert.equal((await request('/admin/portal/chatbot_options',{method:'POST',admin:true,body:{node_id:'bot-root',option_number:8,label:'Tanpa tujuan',action:'goto'}})).status,400);
    assert.equal((await request('/admin/portal/chatbot_nodes/bot-root',{method:'DELETE',admin:true})).status,409);
  });
  let ticket,complaint;
  await t.test('Complaint gets sequential TIK ticket; tracking hides personal data',async()=>{
    assert.equal((await request('/complaints',{method:'POST',body:{...citizen,consent:false}})).status,400);
    assert.equal((await request('/complaints',{method:'POST',body:{...citizen,rt:'9',rw:'9'}})).status,400,'RT/RW must match the chosen dusun');
    assert.equal((await request('/complaints',{method:'POST',body:{...citizen,image:'https://tracker.example/x.png'}})).status,400);
    const a=await request('/complaints',{method:'POST',body:{...citizen,image:photo,status:'selesai'}});assert.equal(a.status,201);assert.equal(a.data.ticket,'TIK-001');assert.equal(a.data.status,'baru');
    const b=await request('/complaints',{method:'POST',body:{...citizen,village_area_id:'dusun-2',rt:'',rw:''}});assert.equal(b.data.ticket,'TIK-002');
    ticket=a.data.ticket;
    const s=await request('/complaints/status',{method:'POST',body:{ticket:'tik-1'}});assert.equal(s.status,200);assert.equal(s.data.ticket,'TIK-001');
    for(const k of ['name','phone','body','location','image','title'])assert.equal(k in s.data,false,k+' must stay private');
    assert.equal((await request('/complaints/status',{method:'POST',body:{ticket:'TIK-999'}})).status,404);
    const list=(await request('/admin/complaints',{admin:true})).data;complaint=list.find(c=>c.ticket==='TIK-001');
    assert.equal(complaint.phone,'6281234567890');assert.equal((await request(complaint.image.slice(4))).status,404,'complaint photo is admin-only');
    assert.equal((await request(complaint.image.slice(4),{admin:true})).status,200);
  });
  await t.test('Admin updates complaint status with timeline note',async()=>{
    assert.equal((await request('/admin/complaints/'+complaint.id,{method:'PUT',admin:true,body:{status:'ditolak',note:'',updated_at:complaint.updated_at}})).status,400);
    assert.equal((await request('/admin/complaints/'+complaint.id,{method:'PUT',admin:true,body:{status:'diproses',note:'x',updated_at:'old'}})).status,409);
    const r=await request('/admin/complaints/'+complaint.id,{method:'PUT',admin:true,body:{status:'diproses',note:'Petugas telah melakukan pengecekan lokasi.',updated_at:complaint.updated_at}});assert.equal(r.status,200);
    const s=(await request('/complaints/status',{method:'POST',body:{ticket}})).data;
    assert.equal(s.status,'diproses');assert.deepEqual(s.updates.map(u=>u.status),['baru','diproses']);assert.equal(s.updates[1].note,'Petugas telah melakukan pengecekan lokasi.');
    const sum=(await request('/admin/summary',{admin:true})).data;assert.equal(sum.complaints.diproses,1);assert.equal(sum.complaints.baru,1);
  });
  await t.test('Live chat: handover, unread, admin reply, private per token',async()=>{
    assert.equal((await request('/chat/start',{method:'POST',body:{name:'Siti',category:'Tidak ada',message:'Halo'}})).status,400);
    const start=await request('/chat/start',{method:'POST',body:{name:'Siti',category:'Administrasi surat',message:'Bagaimana membuat surat domisili?'}});assert.equal(start.status,201);
    const other=await request('/chat/start',{method:'POST',body:{name:'Andi',category:'Bantuan sosial',message:'Pesan pribadi Andi'}});
    const chats=(await request('/admin/chats',{admin:true})).data;const siti=chats.find(c=>c.name==='Siti');assert.equal(siti.unread,1);
    assert.equal((await request('/summary',{admin:true})).status,404);
    assert.ok((await request('/admin/summary',{admin:true})).data.unread>=2);
    assert.equal((await request('/admin/chats/'+siti.id,{admin:true})).data.messages.length,1);
    assert.equal((await request('/admin/chats',{admin:true})).data.find(c=>c.id===siti.id).unread,0,'opening marks read');
    assert.equal((await request('/admin/chats/'+siti.id+'/messages',{method:'POST',admin:true,body:{body:'Silakan datang membawa KTP dan KK.'}})).status,201);
    const thread=(await request('/chat/thread',{method:'POST',body:{token:start.data.token}})).data;
    assert.deepEqual(thread.messages.map(m=>m.sender),['citizen','admin']);assert.equal(thread.unread,1);
    assert.equal(JSON.stringify(thread).includes('Andi'),false,'other conversations never leak');
    assert.equal((await request('/chat/thread',{method:'POST',body:{token:'0'.repeat(48)}})).status,404);
    assert.equal((await request('/admin/chats/'+siti.id,{method:'PUT',admin:true,body:{status:'closed'}})).status,200);
    await request('/chat/send',{method:'POST',body:{token:start.data.token,body:'Terima kasih'}});
    assert.equal((await request('/chat/thread',{method:'POST',body:{token:start.data.token}})).data.status,'open','citizen reply reopens');
    assert.equal((await request('/chat/thread',{method:'POST',body:{token:other.data.token}})).data.messages[0].body,'Pesan pribadi Andi');
  });
  await t.test('Aid recipients are masked and paginated; import validates',async()=>{
    assert.equal((await request('/admin/portal/aid_recipients/import',{method:'POST',admin:true,body:{program_id:'bantuan-contoh-1',rows:'Budi Santoso;Dusun I;Sudah disalurkan\n3603123456789012;Dusun I'}})).status,400);
    const imp=await request('/admin/portal/aid_recipients/import',{method:'POST',admin:true,body:{program_id:'bantuan-contoh-1',rows:'Budi Santoso;Dusun I;Sudah disalurkan\nDewi Sartika;Dusun II'}});assert.equal(imp.data.imported,2);
    const r=(await request('/portal/aid/bantuan-contoh-1/recipients')).data;assert.equal(r.total,4);
    assert.ok(r.items.some(x=>x.name==='B*** S******'&&x.area==='Dusun I'));assert.equal(JSON.stringify(r).includes('Budi'),false);
    assert.equal((await request('/portal/aid/bantuan-contoh-1/recipients?status=Sudah%20disalurkan')).data.total,2);
    await request('/admin/portal/aid_programs/bantuan-contoh-1',{method:'PUT',admin:true,body:{show_recipients:false}});
    assert.equal((await request('/portal/aid/bantuan-contoh-1/recipients')).status,404);
    assert.equal((await request('/portal')).data.aid[0].distribution['Sudah disalurkan'],2);
  });
  await t.test('Village data A–M and homepage texts are CMS-managed; no religion data',async()=>{
    const site=(await request('/content')).data.site;
    assert.deepEqual([...new Set(site.dataSections.map(s=>s.code))],['A','B','C','E','F','G','H','I','J','K','L','M']);
    assert.equal(/agama|pemeluk/i.test(JSON.stringify(site.dataSections)),false,'no SARA-related data');
    assert.equal(site.homeProfileTitle,'Desa pesisir di utara Mauk');assert.equal(site.heroImage,'/images/pesisir-tangerang.jpg');
    const bad=structuredClone(site.dataSections);bad.find(s=>s.chart==='bar').rows[0].value='banyak';
    assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{dataSections:bad}})).status,400);
    assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{dataSections:[{code:'x',title:'Luar',chart:'table',link:'https://evil.example',rows:[]}]}})).status,400);
    const next=structuredClone(site.dataSections);next[0].rows[0].value='450';
    assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{dataSections:next,homeProfileTitle:'Judul dari CMS',regionLines:'Kecamatan Uji'}})).status,200);
    const saved=(await request('/content')).data.site;assert.equal(saved.dataSections[0].rows[0].value,'450');assert.equal(saved.homeProfileTitle,'Judul dari CMS');assert.equal(saved.regionLines,'Kecamatan Uji');
    const sum=(await request('/admin/summary',{admin:true})).data;assert.equal(typeof sum.storage.usedMB,'number');assert.equal(sum.storage.limitMB,300);
    process.env.MEDIA_LIMIT_MB='0.001';
    try{assert.equal((await request('/admin/portal/tourism_gallery',{method:'POST',admin:true,body:{tourism_id:'wisata-pasir-putih',image_url:photo}})).status,507,'uploads stop when storage quota is reached');}
    finally{delete process.env.MEDIA_LIMIT_MB;}
  });
  await t.test('Project documentation and gallery ordering',async()=>{
    const u=await request('/admin/portal/project_updates',{method:'POST',admin:true,body:{project_id:'proyek-contoh-1',date:'2026-09-30',title:'Foto sesudah',phase:'selesai',image_url:photo}});assert.equal(u.status,201);
    assert.equal((await request(u.data.image_url.slice(4))).status,200);
    assert.equal((await request('/admin/portal/development_projects',{method:'POST',admin:true,body:{title:'Proyek',location:'X',start_date:'2026-05-01',target_date:'2026-01-01'}})).status,400);
    const done=await request('/admin/portal/development_projects/proyek-contoh-1',{method:'PUT',admin:true,body:{status:'Selesai'}});assert.equal(done.data.progress,100);
    const gal=await request('/admin/records',{method:'POST',admin:true,body:{kind:'gallery',status:'published',title:'Foto kegiatan',category:'Kegiatan Desa',description:'Uji',image:photo,date:'2026-09-30',sortOrder:1}});
    assert.equal(gal.status,201);assert.equal((await request('/content')).data.gallery.find(g=>g.id===gal.data.id).sortOrder,1);
    assert.equal((await request('/admin/records/'+gal.data.id,{method:'DELETE',admin:true})).status,200);
  });
}

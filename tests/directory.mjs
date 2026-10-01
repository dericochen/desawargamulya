import assert from 'node:assert/strict';
import fs from 'node:fs';
export async function checkDirectory(t,request){
 const photo='data:image/webp;base64,'+fs.readFileSync(new URL('../public/images/rice.webp',import.meta.url)).toString('base64');
 const base={name:'Penginapan Uji',short_description:'Rumah warga untuk pengujian',area:'Kawasan uji',capacity:4,bedrooms:2,price:250000,phone:'081234567890',data_status:'perlu_verifikasi',owner_name:'Pak Uji',address:'Jalan Uji No. 1, RT 003 RW 002'};
 let stay,guide;
 await t.test('Directory demo is labelled, contacts and private coordinates are withheld',async()=>{
  const p=(await request('/portal')).data;assert.equal(p.stays.length,2);assert.equal(p.guides.length,2);
  for(const x of [...p.stays,...p.guides]){assert.equal(x.data_status,'demo');assert.equal(x.phone,'');assert.equal(x.latitude,null);assert.equal(x.longitude,null);assert.ok(!('address'in x));assert.ok(!('submission_status'in x));}
  assert.equal((await request('/admin/portal/tourism_stays',{method:'POST',body:base})).status,401);
  const r=await request('/admin/portal/tourism_stays',{method:'POST',admin:true,body:{...base,cover_image:photo,image_credit:'Foto uji berizin',latitude:-6.03,longitude:106.52}});assert.equal(r.status,201);stay=r.data;
  assert.equal(stay.is_active,0);assert.equal((await request(stay.cover_image.slice(4))).status,404);
  assert.ok(!(await request('/portal')).data.stays.some(x=>x.id===stay.id));
 });
 await t.test('Publication requires consent, valid WhatsApp, paired coordinates and photo attribution',async()=>{
  const put=body=>request('/admin/portal/tourism_stays/'+stay.id,{method:'PUT',admin:true,body});
  for(const body of [{is_active:true,owner_name:'',address:''},{phone:'12345'},{latitude:91},{longitude:null},{price:-1},{capacity:0},{image_credit:''},{data_status:'terverifikasi'}])assert.equal((await put(body)).status,400,JSON.stringify(body));
  let r=await put({is_active:true,contact_consent:true});assert.equal(r.status,200);stay=r.data;
  let pub=(await request('/portal')).data.stays.find(x=>x.id===stay.id);assert.equal(pub.phone,'6281234567890');assert.equal(pub.latitude,null);assert.equal(pub.longitude,null);assert.ok(!('contact_consent'in pub));
  assert.equal(pub.owner_name,'Pak Uji');assert.ok(!('address'in pub));assert.ok(!('submission_status'in pub));
  assert.equal((await request(stay.cover_image.slice(4))).status,200);
  assert.equal((await put({location_consent:true})).status,200);
  pub=(await request('/portal')).data.stays.find(x=>x.id===stay.id);assert.equal(pub.latitude,-6.03);
  assert.equal((await put({contact_consent:false})).status,400);
  assert.equal((await put({data_status:'demo'})).status,200);
  pub=(await request('/portal')).data.stays.find(x=>x.id===stay.id);assert.equal(pub.phone,'');assert.equal(pub.latitude,null);
  assert.equal((await put({data_status:'perlu_verifikasi',availability:'paused',price:null})).status,200);
  pub=(await request('/portal')).data.stays.find(x=>x.id===stay.id);assert.equal(pub.price,null);assert.equal(pub.availability,'paused');
 });
 await t.test('Guides persist services, rates, language, consent and publication state',async()=>{
  const r=await request('/admin/portal/tourism_guides',{method:'POST',admin:true,body:{...base,name:'Pemandu Uji',is_active:true,contact_consent:true,specialties:'Jelajah pesisir',languages:'Bahasa Indonesia, Inggris',duration_hours:2.5,rate_unit:'per orang',inclusions:'Pendampingan',exclusions:'Transportasi'}});assert.equal(r.status,201);guide=r.data;
  let pub=(await request('/portal')).data.guides.find(x=>x.id===guide.id);assert.equal(pub.duration_hours,2.5);assert.equal(pub.rate_unit,'per orang');assert.equal(pub.specialties,'Jelajah pesisir');
  assert.equal(pub.owner_name,'Pak Uji');assert.ok(!('address'in pub));assert.ok(!('submission_status'in pub));
  assert.equal((await request('/admin/portal/tourism_guides/'+guide.id,{method:'PUT',admin:true,body:{duration_hours:0}})).status,400);
  assert.equal((await request('/admin/portal/tourism_guides/'+guide.id,{method:'PUT',admin:true,body:{is_active:false}})).status,200);
  assert.ok(!(await request('/portal')).data.guides.some(x=>x.id===guide.id));
  assert.equal((await request('/admin/site',{method:'PUT',admin:true,body:{tourismServiceTitle:'Wisata yang dikelola warga'}})).status,200);
  assert.equal((await request('/content')).data.site.tourismServiceTitle,'Wisata yang dikelola warga');
 });
 await t.test('Residents can submit stays and guides; hidden until published',async()=>{
  const stayBody={kind:'stay',name:'Villa Pengajuan',owner_name:'Bu Warga',address:'Jalan Warga No. 9, RT 001 RW 004',area:'Dusun Pesisir',short_description:'Villa keluarga dekat pantai',stay_type:'Villa',capacity:5,bedrooms:3,price:400000,images:[photo],phone:'081298765432',consent:true,website:''};
  // Valid stay submission (#1 within the hour) arrives hidden and pending.
  let r=await request('/tourism/submissions',{method:'POST',body:stayBody});assert.equal(r.status,201);assert.equal(r.data.ok,true);
  const created=[];
  const rows=(await request('/admin/portal/tourism_stays',{admin:true})).data,submitted=rows.find(x=>x.name==='Villa Pengajuan');
  assert.ok(submitted);created.push(['tourism_stays',submitted.id]);
  assert.equal(submitted.is_active,0);assert.equal(submitted.submission_status,'pending');assert.equal(submitted.data_status,'perlu_verifikasi');assert.equal(submitted.phone,'6281298765432');
  assert.ok(!(await request('/portal')).data.stays.some(x=>x.id===submitted.id));
  assert.equal((await request(submitted.cover_image.slice(4))).status,404);
  // Admin dashboard counts the pending submission.
  const summary=(await request('/admin/summary',{admin:true})).data;assert.ok(summary.tourismSubmissions.stays>=1);
  // Each of these is rejected (400) and must not create a row.
  const beforeStays=(await request('/admin/portal/tourism_stays',{admin:true})).data.length;
  const beforeGuides=(await request('/admin/portal/tourism_guides',{admin:true})).data.length;
  const bad=[
   {...stayBody,owner_name:''},
   {...stayBody,address:''},
   {...stayBody,images:[]},
   {...stayBody,images:['https://example.com/foto.jpg']},
   {...stayBody,phone:'12345'},
   {...stayBody,consent:false},
   {...stayBody,website:'bot'},
   {...stayBody,kind:'tidakdikenal'}
  ];
  for(const body of bad)assert.equal((await request('/tourism/submissions',{method:'POST',body})).status,400,JSON.stringify(Object.keys(body)));
  assert.equal((await request('/admin/portal/tourism_stays',{admin:true})).data.length,beforeStays);
  assert.equal((await request('/admin/portal/tourism_guides',{admin:true})).data.length,beforeGuides);
  // Guide submissions: missing languages fails; a complete one succeeds (valid #2 within the hour).
  const guideBody={kind:'guide',name:'Pemandu Pengajuan',owner_name:'Pak Warga',address:'Jalan Warga No. 10, RT 002 RW 004',area:'Dusun Pesisir',short_description:'Pendampingan jelajah pesisir',specialties:'Jelajah pesisir\nMemancing',capacity:8,images:[photo],phone:'081233334444',consent:true,website:''};
  assert.equal((await request('/tourism/submissions',{method:'POST',body:{...guideBody,languages:''}})).status,400);
  r=await request('/tourism/submissions',{method:'POST',body:{...guideBody,languages:'Bahasa Indonesia'}});assert.equal(r.status,201);
  const submittedGuide=(await request('/admin/portal/tourism_guides',{admin:true})).data.find(x=>x.name==='Pemandu Pengajuan');
  assert.ok(submittedGuide);created.push(['tourism_guides',submittedGuide.id]);
  // Admin publishes the submitted stay: approval flips submission_status and reveals it (owner_name public, address withheld).
  r=await request('/admin/portal/tourism_stays/'+submitted.id,{method:'PUT',admin:true,body:{is_active:true}});assert.equal(r.status,200);assert.equal(r.data.submission_status,'approved');
  const pub=(await request('/portal')).data.stays.find(x=>x.id===submitted.id);assert.ok(pub);assert.equal(pub.owner_name,'Bu Warga');assert.ok(!('address'in pub));
  assert.equal((await request(submitted.cover_image.slice(4))).status,200);
  // Rate limit: 'tourism-submit' allows 5 valid submissions per hour. Two valid ones already landed in this test;
  // send more valid submissions until the 6th within the hour is refused with 429.
  let last=201,sent=2;
  while(sent<6&&last===201){const extra=await request('/tourism/submissions',{method:'POST',body:{...stayBody,name:'Villa Limit '+sent}});last=extra.status;if(last===201){const row=(await request('/admin/portal/tourism_stays',{admin:true})).data.find(x=>x.name==='Villa Limit '+sent);if(row)created.push(['tourism_stays',row.id]);}sent++;}
  assert.equal(last,429);
  // Clean up every row created here so later count assertions (stays.length===2) still hold.
  for(const [table,id] of created)assert.equal((await request('/admin/portal/'+table+'/'+id,{method:'DELETE',admin:true})).status,200);
 });
 await t.test('Directory deletion removes private media and keeps other listings',async()=>{
  assert.equal((await request('/admin/portal/tourism_stays/'+stay.id,{method:'DELETE',admin:true})).status,200);
  assert.equal((await request(stay.cover_image.slice(4),{admin:true})).status,404);
  assert.equal((await request('/admin/portal/tourism_guides/'+guide.id,{method:'DELETE',admin:true})).status,200);
  assert.equal((await request('/portal')).data.stays.length,2);
 });
}

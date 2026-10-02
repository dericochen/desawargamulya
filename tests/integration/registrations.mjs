import assert from 'node:assert/strict';
export async function checkRegistrations(t,request){
  let event,first,second,stall;
  const date=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
  const eventInput={kind:'event',status:'published',title:'Bazar uji pendaftaran',category:'Ekonomi lokal',date,endDate:date,time:'08:00',endTime:'12:00',location:'Lokasi simulasi',organizer:'Panitia simulasi',description:'Kegiatan pengujian',eventStatus:'Terjadwal',registrationOpen:true,participantCapacity:1,stallCapacity:1,productIds:[]};
  const applicant={name:'Pemohon Privat Satu',address:'Jalan Uji Privat Nomor 45, Marga Mulya',phone:'081234567890',rt:'3',rw:'2',consent:true};
  const send=(data={})=>request('/event-registrations',{method:'POST',body:{...applicant,eventId:event.id,mode:'participant',...data}});
  const adminList=async()=>(await request('/admin/event-registrations',{admin:true})).data;
  const review=(item,values)=>request('/admin/event-registrations/'+item.id,{method:'PUT',admin:true,body:{...item,...values}});
  const changeEvent=async values=>{const result=await request('/admin/records/'+event.id,{method:'PUT',admin:true,body:{...event,...values}});if(result.status===200)event=result.data;return result;};
  await t.test('Event configuration and required applicant data are validated on server',async()=>{
    assert.equal((await request('/admin/records',{method:'POST',admin:true,body:{...eventInput,participantCapacity:0,stallCapacity:0}})).status,400);
    const created=await request('/admin/records',{method:'POST',admin:true,body:eventInput});assert.equal(created.status,201);event=created.data;
    for(const key of ['name','address','phone','rt','rw'])assert.equal((await send({[key]:''})).status,400,key+' must be required');
    for(const invalid of [{rt:'000'},{rw:'x'},{phone:'1234567890'},{consent:false}])assert.equal((await send(invalid)).status,400);
    assert.equal((await send({mode:'stall',businessName:'',productSummary:''})).status,400);
  });
  await t.test('Pending registrations, normalized duplicates and personal data remain private',async()=>{
    first=(await send({status:'approved',attended:true})).data;assert.equal(first.status,'pending');
    second=(await send({name:'Pemohon Privat Dua'})).data;
    stall=(await send({mode:'stall',businessName:'Kerupuk Simulasi',productSummary:'Kerupuk ikan untuk pengujian.'})).data;
    assert.equal((await send({name:'  PEMOHON PRIVAT SATU  ',phone:'+62 812-3456-7890'})).status,409);
    const rows=await adminList();const r=rows.find(v=>v.id===first.id);assert.equal(r.phone,'6281234567890');assert.equal(r.rt,'003');assert.equal(r.rw,'002');assert.equal(r.attended,false);assert.equal('token_hash'in r,false);
    assert.equal((await request('/admin/event-registrations')).status,401);
    assert.equal((await request('/admin/event-registrations/'+r.id,{method:'PUT',body:{...r,status:'approved'}})).status,401);
    const pub=JSON.stringify((await request('/content')).data);for(const value of [applicant.name,applicant.address,'6281234567890',first.token,'Kerupuk Simulasi'])assert.equal(pub.includes(value),false);
    const tracking=await request('/event-registrations/status',{method:'POST',body:{token:first.token}});assert.equal(tracking.data.status,'pending');assert.equal('name'in tracking.data,false);assert.equal('phone'in tracking.data,false);
    assert.equal((await request('/event-registrations/status',{method:'POST',body:{token:'not-a-code'}})).status,404);
  });
  await t.test('Concurrent approvals cannot exceed quota, and quota cannot shrink below approvals',async()=>{
    const rows=await adminList();const people=rows.filter(r=>r.eventId===event.id&&r.mode==='participant');
    const results=await Promise.all(people.map(r=>review(r,{status:'approved'})));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    assert.equal((await send({name:'Pemohon ketiga'})).status,409);
    assert.equal((await changeEvent({participantCapacity:0})).status,409);
    const publicEvent=(await request('/content')).data.events.find(e=>e.id===event.id);assert.equal(publicEvent.enrollment.participant.approved,1);assert.equal(publicEvent.enrollment.stall.approved,0);
    assert.equal((await request('/admin/records/'+event.id,{method:'DELETE',admin:true})).status,409);
  });
  await t.test('Applicants can correct data with private token, and admin can link approved booth products',async()=>{
    let row=(await adminList()).find(r=>r.id===stall.id);
    assert.equal((await review(row,{status:'revision',note:''})).status,400);
    assert.equal((await review(row,{status:'revision',note:'Lengkapi alamat dengan kecamatan.'})).status,200);
    const tracking=await request('/event-registrations/status',{method:'POST',body:{token:stall.token}});assert.equal(tracking.data.status,'revision');assert.match(tracking.data.note,/kecamatan/);
    const revision=await request('/event-registrations/revision',{method:'PUT',body:{...applicant,token:stall.token,address:applicant.address+', Kecamatan Mauk',businessName:'Kerupuk Simulasi',productSummary:'Kerupuk ikan untuk pengujian.'}});assert.equal(revision.status,200);assert.equal(revision.data.status,'pending');
    row=(await adminList()).find(r=>r.id===stall.id);assert.match(row.address,/Mauk/);
    assert.equal((await review(row,{status:'approved',productId:'produk-1'})).status,200);
    assert.equal((await review(row,{status:'approved'})).status,409);
    const publicEvent=(await request('/content')).data.events.find(e=>e.id===event.id);assert.ok(publicEvent.productIds.includes('produk-1'));assert.equal(publicEvent.enrollment.stall.approved,1);
    assert.equal((await request('/event-registrations/revision',{method:'PUT',body:{...applicant,token:stall.token}})).status,409);
  });
  await t.test('Closed, postponed, cancelled, completed and draft events reject new applications',async()=>{
    for(const state of [{registrationOpen:false},{registrationOpen:true,eventStatus:'Ditunda'},{eventStatus:'Dibatalkan'},{eventStatus:'Selesai'},{eventStatus:'Terjadwal',status:'draft'}]){
      assert.equal((await changeEvent(state)).status,200);
      assert.equal((await send({name:'Pemohon Baru Saat Tutup'})).status,400);
    }
    assert.equal((await changeEvent({status:'published',eventStatus:'Terjadwal',registrationOpen:true})).status,200);
  });
  await t.test('Cancellation releases a place; attendance and deletion respect status',async()=>{
    let rows=(await adminList()).filter(r=>r.eventId===event.id);
    const approved=rows.find(r=>r.mode==='participant'&&r.status==='approved'),waiting=rows.find(r=>r.mode==='participant'&&r.status==='pending');
    assert.equal((await request('/admin/event-registrations/'+approved.id,{method:'DELETE',admin:true})).status,409);
    assert.equal((await review(approved,{status:'cancelled',note:'Pemohon batal mengikuti kegiatan.'})).status,200);
    assert.equal((await review(waiting,{status:'approved',attended:true})).status,200);
    rows=(await adminList()).filter(r=>r.eventId===event.id);assert.equal(rows.find(r=>r.id===waiting.id).attended,true);
    for(const row of rows){const result=await review(row,{status:'cancelled',note:'Pengujian selesai.'});assert.equal(result.status,200);assert.equal(result.data.attended,false);assert.equal((await request('/admin/event-registrations/'+row.id,{method:'DELETE',admin:true})).status,200);}
    assert.equal((await request('/admin/records/'+event.id,{method:'DELETE',admin:true})).status,200);
  });
}

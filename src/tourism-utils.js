export const validCoordinates=(lat,lng)=>typeof lat==='number'&&Number.isFinite(lat)&&Math.abs(lat)<=90&&typeof lng==='number'&&Number.isFinite(lng)&&Math.abs(lng)<=180;
export const serviceTab=kind=>kind==='stay'?'penginapan':'pemandu';
export const serviceHref=(kind,item)=>'/wisata?tab='+serviceTab(kind)+'&lihat='+encodeURIComponent(item.slug);
const waUrl=(phone,message)=>'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
// Direct WhatsApp contact. Returns null when the listing cannot be contacted (demo data or no valid number);
// book is null when the service is paused. Messages name the listing and the site so the owner has context.
export function contactLinks(kind,item,identity='Desa Marga Mulya'){
  if(item.data_status==='demo')return null;
  const phone=String(item.phone||'').replace(/[^\d]/g,'').replace(/^0/,'62');
  if(!/^628\d{7,11}$/.test(phone))return null;
  const name=item.name,paused=item.availability==='paused';
  const ask=kind==='stay'
    ?`Halo, saya melihat ${name} di website ${identity}. Saya ingin bertanya tentang penginapan ini.`
    :`Halo, saya melihat layanan pemandu ${name} di website ${identity}. Saya ingin bertanya tentang layanan ini.`;
  const book=kind==='stay'
    ?`Halo, saya ingin booking ${name} dari website ${identity}.\nTanggal menginap: \nJumlah tamu: \nApakah masih tersedia?`
    :`Halo, saya ingin memesan pemandu ${name} dari website ${identity}.\nTanggal kunjungan: \nJumlah peserta: \nApakah tersedia?`;
  return {ask:waUrl(phone,ask),book:paused?null:waUrl(phone,book)};
}
export function filterServices(items,{query='',guests='',budget='',type='',sort='recommended'}={}){
  const term=query.trim().toLocaleLowerCase('id-ID');
  const list=items.filter(x=>(!term||[x.name,x.area,x.short_description,x.amenities,x.specialties,x.languages].filter(Boolean).join(' ').toLocaleLowerCase('id-ID').includes(term))&&(!guests||x.capacity>=Number(guests))&&(!budget||(x.price!==null&&Number.isFinite(x.price)&&x.price<=Number(budget)))&&(!type||x.stay_type===type));
  if(sort==='price')list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity)||a.name.localeCompare(b.name,'id'));
  return list;
}

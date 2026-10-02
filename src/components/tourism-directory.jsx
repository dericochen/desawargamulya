import React,{useState} from 'react';
import {House,Compass,Users,MapPin,ArrowUpRight,Search,MessageCircle,Clock,Check,Languages,UserRound} from 'lucide-react';
import {Modal,Slides,Picture,DataBadge,Field,MultiImageField,Notice,Empty,Link,MapView,money,dateLabel,imagesOf,directionsUrl,navigate,api} from './lib.jsx';
import {contactLinks,filterServices,validCoordinates,serviceTab,serviceHref} from '../utils/tourism-utils.js';
const lines=s=>(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const rateLabel=(kind,item)=>kind==='stay'?'per malam / unit':item.rate_unit+(item.duration_hours?` · ${item.duration_hours} jam`:'');
function Rate({kind,item}){return <div className="service-rate"><span>{item.price===null?'Tarif':'Mulai dari'}</span><strong>{item.price===null?'Tanyakan penyedia':money(item.price)}</strong>{item.price!==null&&<small>{rateLabel(kind,item)}</small>}</div>;}
function Cover({item,kind}){const Icon=kind==='stay'?House:Compass;return item.cover_image?<Picture className="service-photo" src={item.cover_image} alt={item.name}/>:<div className={'service-cover service-cover-'+kind}><Icon size={52} strokeWidth={1}/><span>{item.data_status==='demo'?'LAYANAN CONTOH':'FOTO BELUM TERSEDIA'}</span></div>;}
export function DirectoryIntro({site,stays,guides}){
  const count=(items,label)=>items.length+' '+label+(items.some(x=>x.data_status==='demo')?' · termasuk data contoh':'');
  return <section className="tourism-welcome"><div><span className="eyebrow">WISATA BERSAMA WARGA</span><h2>{site.tourismServiceTitle}</h2><p>{site.tourismServiceIntro}</p></div><div className="tourism-shortcuts"><Link href="/wisata?tab=penginapan"><House/><span><strong>Penginapan warga</strong><small>{count(stays,'pilihan')}</small></span><ArrowUpRight/></Link><Link href="/wisata?tab=pemandu"><Compass/><span><strong>Pemandu lokal</strong><small>{count(guides,'layanan')}</small></span><ArrowUpRight/></Link></div></section>;
}
function ContactActions({kind,item,site}){
  const links=contactLinks(kind,item,site.identity||site.name||'Desa Marga Mulya');
  const paused=item.availability==='paused',provider=kind==='stay'?'ke pemilik':'ke pemandu';
  return <section className="service-contact" aria-labelledby="contact-title"><div className="service-contact-head"><MessageCircle/><div><h3 id="contact-title">Hubungi langsung lewat WhatsApp</h3><p>Tanya atau booking langsung {provider}. Harga akhir dan ketersediaan dikonfirmasi lewat chat.</p></div></div>
    {links?<>
      {paused&&<p className="notice">Sementara tidak menerima tamu.</p>}
      <div className="service-contact-actions">
        <a className="button wa-button" href={links.ask} target="_blank" rel="noreferrer" aria-label={`Tanya ${item.name} via WhatsApp (buka WhatsApp di tab baru)`}><MessageCircle size={18}/>Tanya via WhatsApp</a>
        {links.book&&<a className="button wa-button" href={links.book} target="_blank" rel="noreferrer" aria-label={`${kind==='stay'?'Booking':'Pesan pemandu'} ${item.name} via WhatsApp (buka WhatsApp di tab baru)`}><ArrowUpRight size={18}/>{kind==='stay'?'Booking via WhatsApp':'Pesan pemandu via WhatsApp'}</a>}
      </div>
    </>:<p className="small muted">{item.data_status==='demo'?'Kontak WhatsApp belum tersedia untuk data contoh.':'Kontak WhatsApp belum tersedia.'}</p>}
  </section>;
}
function ListFacts({title,value}){return value?<section><h3>{title}</h3><ul className="service-checklist">{lines(value).map((x,i)=><li key={i}><Check size={16}/>{x}</li>)}</ul></section>:null;}
function ServiceDetail({item,kind,site,onClose}){
  const photos=imagesOf(item,'cover_image'),hasLocation=validCoordinates(item.latitude,item.longitude);
  return <Modal title={item.name} wide onClose={onClose} className="service-dialog">
    {photos.length?<><Slides images={photos} alt={item.name} className="detail-cover"/>{item.image_credit&&<p className="credit">{item.image_credit}</p>}</>:<Cover item={item} kind={kind}/>}
    <div className="service-detail-head"><DataBadge status={item.data_status} long/><Rate kind={kind} item={item}/></div>
    <ContactActions kind={kind} item={item} site={site}/>
    <p className="prose-text">{item.description||item.short_description}</p>
    <div className="service-facts"><span><MapPin/>{item.area}</span>{item.owner_name&&<span><UserRound/>{kind==='stay'?'Pemilik':'Pemandu'}: {item.owner_name}</span>}<span><Users/>Maks. {item.capacity} {kind==='stay'?'tamu':'peserta'}</span>{kind==='stay'?<span><House/>{item.bedrooms} kamar tidur · {item.stay_type}</span>:<><span><Languages/>{item.languages||'Bahasa layanan belum diisi'}</span>{item.duration_hours&&<span><Clock/>{item.duration_hours} jam</span>}</>}</div>
    <div className="service-detail-columns">{kind==='stay'?<><ListFacts title="Fasilitas" value={item.amenities}/><section><h3>Informasi menginap</h3><p>Masuk: {item.check_in||'Konfirmasi pemilik'}<br/>Keluar: {item.check_out||'Konfirmasi pemilik'}</p><p>{item.accessibility||'Kondisi akses dapat ditanyakan kepada pemilik.'}</p></section></>:<><ListFacts title="Kegiatan & keahlian" value={item.specialties}/><div><ListFacts title="Termasuk dalam tarif" value={item.inclusions}/><ListFacts title="Belum termasuk" value={item.exclusions}/></div></>}</div>
    {item.terms&&<section className="service-terms"><h3>Ketentuan layanan</h3><p className="prose-text">{item.terms}</p></section>}
    <p className="small muted">{site.tourismServiceNotice}</p>
    {hasLocation?<section className="service-location"><h3>{kind==='stay'?'Lokasi yang dibagikan pemilik':'Titik temu'}</h3><MapView points={[{id:item.id,name:item.name,category:kind==='stay'?'penginapan':'pemandu',address:item.area,lat:item.latitude,lng:item.longitude,status:item.data_status}]} center={[item.latitude,item.longitude]} focusId={item.id} zoom={16} className="map-small"/><a className="button secondary" href={directionsUrl(item.latitude,item.longitude)} target="_blank" rel="noreferrer"><MapPin/>Petunjuk arah</a></section>:<p className="service-location-note"><MapPin size={18}/> {item.data_status==='demo'?'Lokasi layanan contoh tidak ditampilkan di peta.':'Titik lokasi belum dipublikasikan. Konfirmasikan langsung kepada penyedia.'}</p>}
    {item.verified_on&&item.data_status==='terverifikasi'&&<p className="small muted">Diperiksa pengelola desa pada {dateLabel(item.verified_on)}.</p>}
  </Modal>;
}
const stayDefaults={name:'',stay_type:'Rumah sewa',owner_name:'',address:'',area:'',short_description:'',description:'',capacity:'2',bedrooms:'1',price:'',amenities:'',check_in:'',check_out:'',images:[],phone:'',consent:false,website:''};
const guideDefaults={name:'',owner_name:'',address:'',area:'',short_description:'',description:'',languages:'Bahasa Indonesia',specialties:'',capacity:'6',duration_hours:'',price:'',rate_unit:'per kelompok',images:[],phone:'',consent:false,website:''};
function SubmitService({kind,stayTypes,onClose}){
  const [form,setForm]=useState(kind==='stay'?stayDefaults:guideDefaults),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(null);
  const change=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{setDone(await api('/tourism/submissions',{method:'POST',body:{kind,...form}}));}catch(x){setError(x.message);}finally{setBusy(false);}}
  const title=kind==='stay'?'Ajukan penginapan':'Daftar sebagai pemandu';
  return <Modal title={done?'Pengajuan diterima':title} onClose={onClose} wide>{done?<div className="receipt"><Check size={48}/><h3>Terima kasih, pengajuan Anda terkirim</h3><p>{done.message}</p><button className="button" onClick={onClose}>Tutup</button></div>:
    <form onSubmit={submit}>
      <p className="form-intro">Lengkapi data layanan. Pengelola desa memeriksa kelengkapan sebelum menampilkannya. Alamat lengkap hanya untuk pemeriksaan dan tidak ditampilkan di website.</p>
      <div className="form-grid">
        <Field label={kind==='stay'?'Nama penginapan / villa':'Nama layanan pemandu'} value={form.name} required minLength={3} maxLength={150} onChange={e=>change('name',e.target.value)}/>
        {kind==='stay'?<Field label="Jenis penginapan"><select value={form.stay_type} onChange={e=>change('stay_type',e.target.value)}>{stayTypes.map(t=><option key={t}>{t}</option>)}</select></Field>:<Field label="Nama pemandu" value={form.owner_name} required minLength={3} maxLength={120} onChange={e=>change('owner_name',e.target.value)}/>}
        {kind==='stay'&&<Field label="Nama pemilik" value={form.owner_name} required minLength={3} maxLength={120} onChange={e=>change('owner_name',e.target.value)}/>}
        <Field label="Wilayah yang ditampilkan" value={form.area} required minLength={3} maxLength={200} help="Misalnya dusun atau kawasan" onChange={e=>change('area',e.target.value)}/>
      </div>
      <Field label="Alamat lengkap" help="Hanya untuk pemeriksaan pengelola desa. Website hanya menampilkan wilayah umum."><textarea required minLength={10} maxLength={300} value={form.address} onChange={e=>change('address',e.target.value)}/></Field>
      <Field label="Ringkasan"><textarea required minLength={10} maxLength={300} value={form.short_description} onChange={e=>change('short_description',e.target.value)}/></Field>
      <Field label="Deskripsi lengkap"><textarea maxLength={6000} value={form.description} onChange={e=>change('description',e.target.value)}/></Field>
      {kind==='stay'?<>
        <div className="form-grid">
          <Field label="Kapasitas tamu" type="number" required min="1" max="100" value={form.capacity} onChange={e=>change('capacity',e.target.value)}/>
          <Field label="Kamar tidur" type="number" required min="1" max="50" value={form.bedrooms} onChange={e=>change('bedrooms',e.target.value)}/>
          <Field label="Tarif mulai per malam (Rp)" type="number" min="0" max="100000000" help="Kosongkan jika ingin ditanyakan lewat WhatsApp" value={form.price} onChange={e=>change('price',e.target.value)}/>
        </div>
        <Field label="Fasilitas — satu per baris"><textarea maxLength={2000} value={form.amenities} onChange={e=>change('amenities',e.target.value)}/></Field>
        <div className="form-grid">
          <Field label="Jam masuk" maxLength={80} value={form.check_in} onChange={e=>change('check_in',e.target.value)}/>
          <Field label="Jam keluar" maxLength={80} value={form.check_out} onChange={e=>change('check_out',e.target.value)}/>
        </div>
      </>:<>
        <div className="form-grid">
          <Field label="Bahasa layanan" value={form.languages} required minLength={3} maxLength={200} onChange={e=>change('languages',e.target.value)}/>
          <Field label="Maksimal peserta" type="number" required min="1" max="100" value={form.capacity} onChange={e=>change('capacity',e.target.value)}/>
          <Field label="Durasi (jam)" type="number" min="0.5" max="72" step="0.5" value={form.duration_hours} onChange={e=>change('duration_hours',e.target.value)}/>
          <Field label="Tarif mulai (Rp)" type="number" min="0" max="100000000" help="Kosongkan jika ingin ditanyakan lewat WhatsApp" value={form.price} onChange={e=>change('price',e.target.value)}/>
          <Field label="Satuan tarif"><select value={form.rate_unit} onChange={e=>change('rate_unit',e.target.value)}><option>per kelompok</option><option>per orang</option></select></Field>
        </div>
        <Field label="Kegiatan / keahlian — satu per baris"><textarea required minLength={3} maxLength={2000} value={form.specialties} onChange={e=>change('specialties',e.target.value)}/></Field>
      </>}
      <MultiImageField label={kind==='stay'?'Foto penginapan (1–3 foto)':'Foto layanan (1–3 foto)'} required values={form.images} onChange={v=>change('images',v)}/>
      <div className="form-grid"><Field label="Nomor WhatsApp" type="tel" required placeholder="08… / +62…" value={form.phone} onChange={e=>change('phone',e.target.value)}/></div>
      <div className="honeypot" aria-hidden="true"><label>Website<input autoComplete="off" tabIndex={-1} value={form.website} onChange={e=>change('website',e.target.value)}/></label></div>
      <label className="check-field"><input type="checkbox" required checked={form.consent} onChange={e=>change('consent',e.target.checked)}/><span>{kind==='stay'?'Saya pemilik/pengelola yang berhak. Informasi ini benar, dan saya setuju nama, foto, tarif, wilayah, dan nomor WhatsApp ditampilkan setelah disetujui pengelola desa. Alamat lengkap tidak ditampilkan.':'Saya pemandu/pengelola yang berhak. Informasi ini benar, dan saya setuju nama, foto, tarif, wilayah, dan nomor WhatsApp ditampilkan setelah disetujui pengelola desa. Alamat lengkap tidak ditampilkan.'}</span></label>
      <Notice error>{error}</Notice>
      <div className="form-actions"><button className="button" disabled={busy}>{busy?'Mengirim…':'Kirim pengajuan'}</button><button type="button" className="button secondary" onClick={onClose}>Batal</button></div>
    </form>}</Modal>;
}
export default function TourismDirectory({kind,items,site}){
  const [filters,setFilters]=useState({query:'',guests:'',budget:'',type:'',sort:'recommended'});
  const set=(key,value)=>setFilters(f=>({...f,[key]:value}));
  const tab=serviceTab(kind),params=new URLSearchParams(location.search),slug=params.get('lihat'),selected=items.find(x=>x.slug===slug),list=filterServices(items,filters);
  const showForm=params.get('ajukan')==='1';
  const stayTypes=[...new Set([...(kind==='stay'?items.map(i=>i.stay_type):[]),'Rumah sewa','Homestay','Kamar tamu','Villa'])];
  const hasFilters=filters.query||filters.guests||filters.budget||filters.type;
  return <><p className="hub-intro-text">{kind==='stay'?site.tourismStayIntro:site.tourismGuideIntro}</p>
    <div className="service-filters"><div className="search-field"><Search size={18}/><input aria-label="Cari layanan wisata" placeholder={kind==='stay'?'Cari nama, wilayah, atau fasilitas…':'Cari nama, kegiatan, atau bahasa…'} value={filters.query} onChange={e=>set('query',e.target.value)}/></div><Field label="Jumlah orang" type="number" min="1" max="100" placeholder="Semua" value={filters.guests} onChange={e=>set('guests',e.target.value)}/><Field label={kind==='stay'?'Tarif maks. per malam':'Tarif maks. per layanan'} type="number" min="0" step="10000" placeholder="Tanpa batas" value={filters.budget} onChange={e=>set('budget',e.target.value)}/>{kind==='stay'&&<Field label="Jenis"><select value={filters.type} onChange={e=>set('type',e.target.value)}><option value="">Semua jenis</option>{[...new Set(items.map(i=>i.stay_type))].map(t=><option key={t}>{t}</option>)}</select></Field>}<Field label="Urutkan"><select value={filters.sort} onChange={e=>set('sort',e.target.value)}><option value="recommended">Urutan pengelola</option><option value="price">Tarif terendah</option></select></Field></div>
    <div className="service-result"><p aria-live="polite">{list.length} {kind==='stay'?'penginapan':'pemandu'} ditemukan</p>{hasFilters&&<button className="plain-link" onClick={()=>setFilters({query:'',guests:'',budget:'',type:'',sort:'recommended'})}>Hapus filter</button>}</div>
    {list.length?<div className="service-grid">{list.map(item=><article className="service-card" key={item.id}><div className="service-image"><Cover kind={kind} item={item}/>{item.data_status==='demo'&&<span className="service-demo">Data contoh</span>}</div><div className="service-body"><div className="service-card-meta"><span>{kind==='stay'?item.stay_type:'Pemandu lokal'}</span>{item.data_status!=='demo'&&<DataBadge status={item.data_status}/>}</div><h3>{item.name}</h3><p className="service-area"><MapPin size={15}/>{item.area}</p><p>{item.short_description}</p><div className="service-chips"><span><Users size={14}/>Maks. {item.capacity} orang</span>{kind==='stay'?<span>{item.bedrooms} kamar tidur</span>:item.duration_hours?<span><Clock size={14}/>{item.duration_hours} jam</span>:null}</div>{kind==='guide'&&<p className="small muted">{item.languages}</p>}<div className="service-card-bottom"><Rate kind={kind} item={item}/><button className="button secondary" onClick={()=>navigate(serviceHref(kind,item))} aria-label={'Lihat detail '+item.name}>Lihat detail<ArrowUpRight size={16}/></button></div>{item.availability==='paused'&&<p className="service-paused">Sementara tidak menerima tamu</p>}</div></article>)}</div>:<Empty title={items.length?'Belum ada pilihan yang cocok':'Layanan belum tersedia'} text={items.length?'Coba kurangi filter atau ubah kata kunci.':'Pengelola desa sedang melengkapi informasi layanan warga.'}/>}
    <aside className="tourism-support"><div><House/><h3>{kind==='stay'?'Punya villa atau rumah untuk disewakan?':'Punya jasa pemandu wisata?'}</h3><p>{kind==='stay'?'Ajukan penginapan Anda. Pengelola desa memeriksa kelengkapan dan menghubungi Anda sebelum ditampilkan.':'Daftarkan layanan pemandu Anda. Pengelola desa memeriksa kelengkapan dan menghubungi Anda sebelum ditampilkan.'}</p></div><button className="button secondary" onClick={()=>navigate('/wisata?tab='+tab+'&ajukan=1')}>{kind==='stay'?'Ajukan penginapan':'Daftar sebagai pemandu'}<ArrowUpRight size={16}/></button></aside>
    {slug&&!selected&&<p role="status" className="notice">Layanan ini sudah tidak tersedia. Silakan pilih layanan lain.</p>}
    {selected&&<ServiceDetail kind={kind} item={selected} site={site} onClose={()=>navigate('/wisata?tab='+tab)}/>}
    {showForm&&<SubmitService kind={kind} stayTypes={stayTypes} onClose={()=>navigate('/wisata?tab='+tab)}/>}
  </>;
}

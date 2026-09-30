// Public Portal Desa pages: tourism, village map, development projects, social aid and global search.
import React,{useEffect,useMemo,useState} from 'react';
import {MapPin,Navigation,Phone,Clock,Ticket,ListChecks,Images,Search,Map as MapIcon,CalendarDays,Wallet,Landmark,HardHat,HeartHandshake,CircleHelp,Newspaper,Building2,ShieldCheck,ChevronLeft,ChevronRight} from 'lucide-react';
import {Link,Modal,PageIntro,Empty,Notice,Busy,api,money,dateLabel,MapView,mapPoints,Photo,Picture,Progress,Unknown,directionsUrl,telHref,numberLabel,param,navigate,HubTabs,Slides,PhotoCount,imagesOf} from './lib.jsx';
import {mapFilters,facilityCategories} from '../server/portal-schema.mjs';

const categoryLabel=Object.fromEntries(facilityCategories.map(([k,l,e])=>[k,e+' '+l]));
// Keeps a detail dialog in sync with ?lihat= so detail views can be shared and the back button closes them.
function useDetail(items,key='id'){
  const find=()=>items.find(x=>x[key]===param('lihat'))||null;
  const [selected,setSelected]=useState(find);
  useEffect(()=>{setSelected(find());},[location.search,items]);
  return [selected,item=>{const p=new URLSearchParams(location.search);item?p.set('lihat',item[key]):p.delete('lihat');const q=p.toString();navigate(location.pathname+(q?'?'+q:''));}];
}
const Fact=({icon:Icon,label,children})=><div className="fact"><Icon aria-hidden="true"/><div><dt>{label}</dt><dd>{children}</dd></div></div>;

export function TourismCard({place:t,onDetail}){
  return <article className="tourism-card">
    <div className="card-photo"><Photo src={t.cover_image} alt={'Foto '+t.name} className="tourism-photo"/><PhotoCount n={imagesOf(t,'cover_image').length+t.gallery.reduce((n,g)=>n+imagesOf(g,'image_url').length,0)}/></div>
    <div className="tourism-body"><span className="tag">{t.category||'Wisata'}</span><h3>{t.name}</h3>
      <p className="tourism-address"><MapPin size={16} aria-hidden="true"/>{t.address}</p>
      {t.short_description&&<p className="tourism-summary">{t.short_description}</p>}
      <div className="card-actions"><button className="button" onClick={()=>onDetail(t)}>Lihat Detail</button><Link className="button secondary" href={'/peta-desa?lokasi='+t.id}><MapIcon/>Lihat di Peta</Link></div>
    </div>
  </article>;
}
function TourismDetail({place:t,onClose}){
  // Cover photos first, then every gallery photo; all can be swiped in one slider.
  const photos=[...imagesOf(t,'cover_image').map(src=>({src,caption:t.name})),...t.gallery.flatMap(g=>imagesOf(g,'image_url').map(src=>({src,caption:g.caption||t.name})))];
  return <Modal title={t.name} wide onClose={onClose}>
    <Slides images={photos.map(p=>p.src)} captions={photos.map(p=>p.caption)} alt={t.name} className="detail-cover tourism-detail-photo"/>
    <div className="article-meta"><span className="tag">{t.category||'Wisata'}</span></div>
    <p className="prose-text">{t.description||t.short_description||'Deskripsi belum tersedia.'}</p>
    <dl className="fact-list">
      <Fact icon={MapPin} label="Alamat">{t.address}</Fact>
      <Fact icon={Clock} label="Jam operasional"><Unknown>{t.opening_hours}</Unknown></Fact>
      <Fact icon={Ticket} label="Harga tiket"><Unknown>{t.ticket_information}</Unknown></Fact>
      <Fact icon={ListChecks} label="Fasilitas">{t.facilities?<ul className="plain-list">{t.facilities.split('\n').filter(Boolean).map((f,i)=><li key={i}>{f}</li>)}</ul>:<Unknown/>}</Fact>
      <Fact icon={Phone} label="Kontak">{t.phone?<a href={telHref(t.phone)}>{t.phone}</a>:<span className="unknown">Hubungi pengelola untuk informasi terbaru.</span>}</Fact>
    </dl>
    {!photos.length&&<p className="small muted"><Images size={15} aria-hidden="true"/> Belum ada foto asli destinasi ini. Pengelola dapat menambahkannya dari panel admin.</p>}
    <h3 className="detail-heading">Lokasi</h3>
    <MapView points={[{id:t.id,name:t.name,category:'wisata',address:t.address,lat:t.latitude,lng:t.longitude}]} center={[t.latitude,t.longitude]} zoom={15} focusId={t.id} className="map-small" label={'Peta lokasi '+t.name}/>
    <div className="form-actions"><a className="button" href={directionsUrl(t.latitude,t.longitude)} target="_blank" rel="noreferrer"><Navigation/>Buka Petunjuk Arah</a><Link className="button secondary" href={'/peta-desa?lokasi='+t.id} onClick={onClose}><MapIcon/>Lihat di Peta Desa</Link></div>
  </Modal>;
}
export function Tourism({data}){
  const list=data.portal.tourism,[selected,select]=useDetail(list,'slug');
  return <><PageIntro {...data.site.pages.wisata}>{data.site.pages.wisata.intro}</PageIntro>
    <h2 className="sr-only">Daftar destinasi wisata</h2>{list.length?<div className="tourism-grid">{list.map(t=><TourismCard key={t.id} place={t} onDetail={select}/>)}</div>:<Empty title="Belum ada destinasi" text="Destinasi wisata akan tampil setelah ditambahkan pengelola."/>}
    <div className="subtle-note"><ShieldCheck size={18}/><p>Harga tiket, jam buka, dan fasilitas hanya ditampilkan jika sudah dikonfirmasi. Foto yang belum tersedia sengaja tidak diganti gambar buatan.</p></div>
    {selected&&<TourismDetail place={selected} onClose={()=>select(null)}/>}</>;
}

export function MapPage({data}){
  const all=useMemo(()=>mapPoints(data.portal),[data.portal]);const [filter,setFilter]=useState('semua'),[focus,setFocus]=useState(param('lokasi'));
  useEffect(()=>{const id=param('lokasi');if(id){setFocus(id);setFilter('semua');}},[location.search]);
  const groups=Object.fromEntries(mapFilters.map(([k,,cats])=>[k,cats]));
  const points=filter==='semua'?all:all.filter(p=>groups[filter].includes(p.category));
  const s=data.site;
  return <><PageIntro {...s.pages['peta-desa']}>{s.pages['peta-desa'].intro}</PageIntro>
    <div className="map-filters" role="group" aria-label="Filter kategori lokasi">{mapFilters.map(([k,label,cats])=>{const n=k==='semua'?all.length:all.filter(p=>cats.includes(p.category)).length;return <button key={k} aria-pressed={filter===k} className={filter===k?'active':''} onClick={()=>{setFilter(k);setFocus('');}}>{label}<span>{n}</span></button>;})}</div>
    <MapView points={points} center={[s.villageLat,s.villageLng]} zoom={14} focusId={focus} className="map-large" label={'Peta interaktif '+s.identity}/>
    <p className="small muted map-hint">Klik peta terlebih dahulu untuk memperbesar dengan roda tetikus. Di ponsel, gunakan dua jari. Data peta © kontributor OpenStreetMap.</p>
    <section className="location-list" aria-labelledby="daftar-lokasi"><h2 id="daftar-lokasi">Daftar lokasi ({points.length})</h2>
      {points.length?<ul>{points.map(p=><li key={p.id}><div><span className="map-list-category">{categoryLabel[p.category]||p.category}</span><strong>{p.name}</strong><p>{p.address}</p></div><div className="location-actions"><button className="button secondary" onClick={()=>{setFocus('');setTimeout(()=>setFocus(p.id));window.scrollTo({top:document.querySelector('.map-large')?.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});}}>Tampilkan di peta</button><a className="button secondary" href={directionsUrl(p.lat,p.lng)} target="_blank" rel="noreferrer"><Navigation/>Petunjuk Arah</a></div></li>)}</ul>:<Empty title="Tidak ada lokasi pada kategori ini"/>}
    </section></>;
}

export const projectStatusClass={Direncanakan:'pending',Berjalan:'revision',Selesai:'published',Ditunda:'rejected'};
const budgetLabel=n=>n>0?money(n):'Belum diumumkan';
export function ProjectCard({project:p,onDetail}){
  return <article className="project-card"><div className="card-photo"><Photo src={p.cover_image} alt={'Foto '+p.title} className="project-photo"/><PhotoCount n={imagesOf(p,'cover_image').length}/></div><div className="project-body">
    <span className={'status '+projectStatusClass[p.status]}>{p.status}</span><h3>{p.title}</h3><Progress value={p.progress}/>
    <dl className="project-facts"><div><dt>Anggaran</dt><dd>{budgetLabel(p.budget)}</dd></div><div><dt>Sumber dana</dt><dd><Unknown>{p.funding_source}</Unknown></dd></div><div><dt>Tahun</dt><dd>{p.year}</dd></div><div><dt>Lokasi</dt><dd>{[p.area_name,p.location].filter(Boolean).join(' · ')}</dd></div></dl>
    <button className="button secondary full" onClick={()=>onDetail(p)}>Lihat Detail</button></div></article>;
}
function ProjectDetail({project:p,onClose}){
  const phases=[['sebelum','Foto sebelum'],['proses','Foto proses'],['selesai','Foto selesai']];const photos=p.updates.filter(u=>u.image_url);
  return <Modal title={p.title} wide onClose={onClose}>
    <Slides images={imagesOf(p,'cover_image')} alt={p.title} className="detail-cover"/>
    <div className="article-meta"><span className={'status '+projectStatusClass[p.status]}>{p.status}</span><span>Tahun {p.year}</span></div>
    <Progress value={p.progress}/>
    {p.description&&<p className="prose-text">{p.description}</p>}
    <dl className="detail-table">{[['Lokasi',p.location],['Dusun',p.area_name],['RT / RW',p.rt||p.rw?`RT ${p.rt||'—'} / RW ${p.rw||'—'}`:''],['Tahun',p.year],['Sumber dana',p.funding_source],['Anggaran',budgetLabel(p.budget)],['Pelaksana',p.contractor],['Tanggal mulai',dateLabel(p.start_date)],['Target selesai',dateLabel(p.target_date)],['Status',p.status]].map(([k,v])=><div key={k}><dt>{k}</dt><dd><Unknown>{v}</Unknown></dd></div>)}</dl>
    <h3 className="detail-heading">Dokumentasi pembangunan</h3>
    {photos.length?phases.map(([k,label])=>{const items=photos.filter(u=>u.phase===k);return items.length?<div key={k} className="doc-group"><h4>{label}</h4><div className="doc-grid">{items.map(u=><figure key={u.id}><Slides images={imagesOf(u,'image_url')} alt={u.title} className="doc-slides"/><figcaption>{u.title}{u.date&&' · '+dateLabel(u.date)}</figcaption></figure>)}</div></div>:null;}):<p className="small muted">Belum ada foto dokumentasi.</p>}
    {photos.some(u=>!u.phase)&&<div className="doc-grid">{photos.filter(u=>!u.phase).map(u=><figure key={u.id}><Slides images={imagesOf(u,'image_url')} alt={u.title} className="doc-slides"/><figcaption>{u.title}</figcaption></figure>)}</div>}
    <h3 className="detail-heading">Timeline progres</h3>
    {p.updates.length?<ol className="timeline">{p.updates.map(u=><li key={u.id} className="done"><span className="timeline-dot" aria-hidden="true"/><div><time>{dateLabel(u.date)}</time><strong>{u.title}{u.progress>0&&` · ${u.progress}%`}</strong>{u.note&&<p>{u.note}</p>}</div></li>)}</ol>:<p className="small muted">Belum ada catatan progres.</p>}
  </Modal>;
}
export function Development({data,embedded}){
  const all=data.portal.projects,[status,setStatus]=useState('Semua'),[year,setYear]=useState('Semua'),[selected,select]=useDetail(all);
  const list=all.filter(p=>(status==='Semua'||p.status===status)&&(year==='Semua'||String(p.year)===year));
  return <>{embedded?<p className="hub-intro-text">{data.site.pages.pembangunan.intro}</p>:<PageIntro {...data.site.pages.pembangunan}>{data.site.pages.pembangunan.intro}</PageIntro>}
    <div className="filter-bar"><select aria-label="Status pembangunan" value={status} onChange={e=>setStatus(e.target.value)}>{['Semua','Direncanakan','Berjalan','Selesai','Ditunda'].map(s=><option key={s} value={s}>{s==='Semua'?'Semua status':s}</option>)}</select><select aria-label="Tahun" value={year} onChange={e=>setYear(e.target.value)}>{['Semua',...new Set(all.map(p=>String(p.year)))].map(y=><option key={y} value={y}>{y==='Semua'?'Semua tahun':y}</option>)}</select><span className="result-count">{list.length} kegiatan</span></div>
    <h2 className="sr-only">Daftar kegiatan pembangunan</h2>{list.length?<div className="project-grid">{list.map(p=><ProjectCard key={p.id} project={p} onDetail={select}/>)}</div>:<Empty title="Belum ada kegiatan pembangunan" text="Coba ubah filter status atau tahun."/>}
    {data.site.demo&&<div className="subtle-note"><ShieldCheck size={18}/><p>Kegiatan bertanda “(contoh)” adalah data demonstrasi, bukan laporan resmi desa.</p></div>}
    {selected&&<ProjectDetail project={selected} onClose={()=>select(null)}/>}</>;
}

function Recipients({program,areas}){
  const [page,setPage]=useState(1),[area,setArea]=useState(''),[status,setStatus]=useState(''),[result,setResult]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true;setError('');api(`/portal/aid/${program.id}/recipients?page=${page}&area=${encodeURIComponent(area)}&status=${encodeURIComponent(status)}`).then(r=>alive&&setResult(r)).catch(e=>alive&&setError(e.message));return()=>{alive=false;};},[program.id,page,area,status]);
  return <section className="recipients"><h3 className="detail-heading">Daftar penerima</h3>
    <div className="privacy-note"><ShieldCheck size={19}/><p>Nama disamarkan. NIK, nomor KK, nomor HP, dan alamat rumah tidak ditampilkan.</p></div>
    <div className="filter-bar"><select aria-label="Filter dusun" value={area} onChange={e=>{setArea(e.target.value);setPage(1);}}><option value="">Semua dusun</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select aria-label="Filter status penyaluran" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Semua status</option>{['Sudah disalurkan','Belum disalurkan','Ditunda'].map(s=><option key={s}>{s}</option>)}</select>{result&&<span className="result-count">{numberLabel(result.total)} penerima</span>}</div>
    <Notice error>{error}</Notice>
    {!result?!error&&<Busy/>:result.items.length?<><div className="table-wrap"><table className="data-table"><thead><tr><th scope="col">Nama</th><th scope="col">Dusun</th><th scope="col">Program</th><th scope="col">Status penyaluran</th></tr></thead><tbody>{result.items.map((r,i)=><tr key={i}><td>{r.name}</td><td>{r.area}</td><td>{program.name}</td><td><span className={'status '+(r.status==='Sudah disalurkan'?'published':r.status==='Ditunda'?'rejected':'pending')}>{r.status}</span></td></tr>)}</tbody></table></div>
      {result.pages>1&&<div className="pager"><button className="icon-button" aria-label="Halaman sebelumnya" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft/></button><span>Halaman {page} dari {result.pages}</span><button className="icon-button" aria-label="Halaman berikutnya" disabled={page>=result.pages} onClick={()=>setPage(page+1)}><ChevronRight/></button></div>}</>
      :<Empty title="Belum ada penerima yang sesuai"/>}
  </section>;
}
function AidDetail({program:p,areas,onClose}){
  const stages=[...new Set(p.documentation.map(d=>d.stage||'Dokumentasi'))];
  return <Modal title={p.name} wide onClose={onClose}>
    {imagesOf(p,'cover_image').length>0&&<Slides images={imagesOf(p,'cover_image')} alt={p.name} className="detail-cover"/>}
    <div className="article-meta"><span className={'status '+projectStatusClass[{Persiapan:'Direncanakan',Penyaluran:'Berjalan',Selesai:'Selesai',Ditunda:'Ditunda'}[p.status]]}>{p.status}</span><span>Tahun {p.year}</span></div>
    {p.description&&<p className="prose-text">{p.description}</p>}
    <dl className="detail-table">{[['Nama program',p.name],['Tahun',p.year],['Sumber dana',p.funding_source],['Jumlah penerima',p.recipient_count?numberLabel(p.recipient_count)+' penerima':''],['Status',p.status]].map(([k,v])=><div key={k}><dt>{k}</dt><dd><Unknown>{v}</Unknown></dd></div>)}</dl>
    {Object.keys(p.distribution).length>0&&<div className="distribution">{Object.entries(p.distribution).map(([k,v])=><div key={k}><strong>{numberLabel(v)}</strong><span>{k}</span></div>)}</div>}
    <h3 className="detail-heading">Dokumentasi penyaluran</h3>
    {p.documentation.length?stages.map(s=><div key={s} className="doc-group"><h4>{s}</h4><div className="doc-grid">{p.documentation.filter(d=>(d.stage||'Dokumentasi')===s).map(d=><figure key={d.id}><Slides images={imagesOf(d,'image_url')} alt={d.caption||s} className="doc-slides"/><figcaption>{d.caption}{d.date&&' · '+dateLabel(d.date)}</figcaption></figure>)}</div></div>):<p className="small muted">Belum ada dokumentasi penyaluran.</p>}
    {p.show_recipients?<Recipients program={p} areas={areas}/>:<p className="small muted">Daftar penerima program ini tidak dipublikasikan.</p>}
  </Modal>;
}
export function Aid({data,embedded}){
  const list=data.portal.aid,[selected,select]=useDetail(list);
  return <>{embedded?<p className="hub-intro-text">{data.site.pages.bantuan.intro}</p>:<PageIntro {...data.site.pages.bantuan}>{data.site.pages.bantuan.intro}</PageIntro>}
    <h2 className="section-title">Program bantuan</h2>
    {list.length?<div className="aid-grid">{list.map(p=><button key={p.id} className="aid-card" onClick={()=>select(p)}><HeartHandshake aria-hidden="true"/><div><h3>{p.name}</h3><p>{p.year} · {p.funding_source||'Sumber dana belum diumumkan'}</p><p><strong>{p.recipient_count?numberLabel(p.recipient_count)+' penerima':'Jumlah penerima belum diumumkan'}</strong></p></div><span className="status">{p.status}</span></button>)}</div>:<Empty title="Belum ada program bantuan yang diumumkan"/>}
    <div className="subtle-note"><ShieldCheck size={18}/><p>Untuk memastikan status bantuan pribadi, datang ke Kantor Desa dengan membawa KTP. Website tidak meminta atau menampilkan NIK.</p></div>
    {selected&&<AidDetail program={selected} areas={data.portal.areas} onClose={()=>select(null)}/>}</>;
}

export function Transparency({data}){
  const tab=param('tab')==='bantuan'?'bantuan':'pembangunan',s=data.site;
  return <><PageIntro {...s.pages.transparansi}>{s.pages.transparansi.intro}</PageIntro><HubTabs label="Bagian transparansi" active={tab} tabs={[['pembangunan',s.nav.pembangunan||'Pembangunan'],['bantuan',s.nav.bantuan||'Bantuan desa']]}/><div id="hub-panel" role="tabpanel" aria-labelledby={'hub-tab-'+tab}>{tab==='bantuan'?<Aid data={data} embedded/>:<Development data={data} embedded/>}</div></>;
}

// Global search opens as a dialog from the header (not a separate page).
export function SearchDialog({data}){
  const [open,setOpen]=useState(false),[q,setQ]=useState('');
  useEffect(()=>{const f=e=>{setQ(e.detail?.q||'');setOpen(true);};window.addEventListener('mm:search',f);if(window.__mmPendingSearch){setQ(window.__mmPendingSearch.trim());setOpen(true);delete window.__mmPendingSearch;}return()=>window.removeEventListener('mm:search',f);},[]);
  if(!open)return null;
  const term=q.trim().toLowerCase(),has=(...v)=>v.join(' ').toLowerCase().includes(term),p=data.portal;
  const groups=term.length<2?[]:[
    ['Berita & pengumuman',Newspaper,data.articles.filter(a=>has(a.title,a.excerpt,a.body,a.category)).map(a=>({id:a.id,title:a.title,text:a.category+' · '+dateLabel(a.date),href:'/informasi?baca='+a.id}))],
    ['Agenda kegiatan',CalendarDays,data.events.filter(e=>has(e.title,e.description,e.location,e.category)).map(e=>({id:e.id,title:e.title,text:dateLabel(e.date)+' · '+e.location,href:'/informasi?tab=agenda&lihat='+e.id}))],
    ['Wisata',MapPin,p.tourism.filter(t=>has(t.name,t.description,t.address,t.category)).map(t=>({id:t.id,title:t.name,text:t.address,href:'/wisata?lihat='+t.slug}))],
    ['Pembangunan',HardHat,p.projects.filter(x=>has(x.title,x.description,x.location,x.area_name)).map(x=>({id:x.id,title:x.title,text:x.status+' · '+x.year,href:'/transparansi?tab=pembangunan&lihat='+x.id}))],
    ['Bantuan desa',HeartHandshake,p.aid.filter(x=>has(x.name,x.description)).map(x=>({id:x.id,title:x.name,text:x.status+' · '+x.year,href:'/transparansi?tab=bantuan&lihat='+x.id}))],
    ['Pertanyaan umum (FAQ)',CircleHelp,p.faqs.filter(f=>has(f.question,f.answer)).map(f=>({id:f.id,title:f.question,text:f.answer.slice(0,120)+(f.answer.length>120?'…':''),href:'/pengaduan?faq='+f.id}))],
    ['Fasilitas umum',Building2,p.facilities.filter(f=>has(f.name,f.address,categoryLabel[f.category])).map(f=>({id:f.id,title:f.name,text:categoryLabel[f.category]+' · '+f.address,href:'/peta-desa?lokasi='+f.id}))]
  ].filter(g=>g[2].length);
  const close=()=>setOpen(false);
  return <Modal title="Cari di website desa" wide onClose={close} className="search-dialog">
    <form role="search" className="search-page-form" onSubmit={e=>e.preventDefault()}><div className="search-field"><Search/><input autoFocus aria-label="Kata kunci pencarian" placeholder="Contoh: pantai, surat domisili, drainase…" value={q} onChange={e=>setQ(e.target.value)}/></div></form>
    {term.length<2?<p className="muted">Ketik minimal 2 huruf untuk mencari berita, pengumuman, wisata, pembangunan, FAQ, dan fasilitas umum.</p>:groups.length?<div className="search-results" aria-live="polite">{groups.map(([title,Icon,items])=><section key={title}><h2><Icon aria-hidden="true"/>{title} <span>({items.length})</span></h2><ul>{items.map(i=><li key={i.id}><Link href={i.href} onClick={close}><strong>{i.title}</strong><span>{i.text}</span></Link></li>)}</ul></section>)}</div>:<Empty title="Tidak ditemukan" text="Coba kata kunci lain, atau tanyakan melalui Tanya Desa."/>}</Modal>;
}

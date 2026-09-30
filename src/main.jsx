import React,{useEffect,useRef,useState} from 'react';import{createRoot}from'react-dom/client';
import{Menu,X,MapPin,Mail,Phone,ShieldCheck,Clock,ChevronDown,Search,PhoneCall}from'lucide-react';
import{api,Link,useRoute,Busy,Notice,Modal,openEmergency}from'./lib.jsx';
import PublicPages,{Home}from'./pages.jsx';
import{Assistant,EmergencySheet}from'./assistant.jsx';
import Admin from'./admin.jsx';
import './style.css';

// Menu structure; labels come from the CMS (site.nav) so admins can rename items.
const menuGroups=nav=>[
  {href:'/',label:nav.home},{href:'/profil',label:nav.profil},
  {label:'Informasi',items:[['/informasi','Berita & pengumuman'],['/agenda',nav.agenda],['/lapak',nav.lapak],['/galeri',nav.galeri]]},
  {label:nav.pengaduan||'Layanan warga',items:[['/pengaduan','Pengaduan & FAQ'],['/pengaduan/cek','Cek pengaduan'],['/tanya-desa','Tanya Desa'],['darurat','Nomor darurat']]},
  {href:'/wisata',label:nav.wisata},{href:'/peta-desa',label:nav['peta-desa']},
  {label:'Transparansi',items:[['/pembangunan',nav.pembangunan],['/bantuan',nav.bantuan]]},
  {href:'/kontak',label:nav.kontak}
];
function MenuLink({href,label,path,onPick}){
  if(href==='darurat')return <button className="menu-emergency" onClick={()=>{onPick();openEmergency();}}><PhoneCall size={16}/>{label}</button>;
  return <Link href={href} className={path===href?'active':''} aria-current={path===href?'page':undefined} onClick={onPick}>{label}</Link>;
}
function Dropdown({group,path}){
  const [open,setOpen]=useState(false),ref=useRef();const active=group.items.some(([h])=>h===path);
  useEffect(()=>{if(!open)return;const out=e=>{if(!ref.current?.contains(e.target))setOpen(false);};const esc=e=>{if(e.key==='Escape'){setOpen(false);ref.current?.querySelector('button')?.focus();}};document.addEventListener('pointerdown',out);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',out);document.removeEventListener('keydown',esc);};},[open]);
  useEffect(()=>setOpen(false),[path]);
  return <div className="nav-dropdown" ref={ref}><button className={'nav-top '+(active?'active':'')} aria-expanded={open} onClick={()=>setOpen(!open)}>{group.label}<ChevronDown size={15} aria-hidden="true"/></button>{open&&<div className="nav-menu">{group.items.map(([h,l])=><MenuLink key={h} href={h} label={l} path={path} onPick={()=>setOpen(false)}/>)}</div>}</div>;
}
function App(){
 const[data,setData]=useState(null),[error,setError]=useState(''),[menu,setMenu]=useState(false),[credits,setCredits]=useState(false);const path=useRoute();
 const refresh=()=>Promise.all([api('/content'),api('/portal')]).then(([content,portal])=>{setData({...content,portal});setError('');}).catch(e=>setError(e.message));
 useEffect(()=>{refresh();},[]);useEffect(()=>{setMenu(false);},[path]);
 if(path==='/admin')return <Admin refreshPublic={refresh}/>;
 if(error)return <main className="container"><Notice error>{error}</Notice><button className="button" onClick={refresh}>Coba lagi</button></main>;
 if(!data)return <Busy/>;const{site:s}=data;const groups=menuGroups(s.nav);
 return <><a className="skip-link" href="#content">Lewati ke konten</a>
 <div className="topbar"><div className="container topbar-inner"><span>{s.area}</span><div><span>{s.demo?'Versi demonstrasi EcoQuest':'Portal digital desa'}</span><Link href="/admin"><ShieldCheck size={14}/>Admin</Link></div></div></div>
 <header className="header"><div className="container header-inner"><Link href="/" className="brand"><span className="brand-mark">M<span>m</span></span><span><small>PORTAL DIGITAL DESA</small><strong>{s.name}</strong></span></Link>
  <div className="header-actions"><Link href="/cari" className="header-search" aria-label="Cari di website"><Search size={18}/><span>Cari</span></Link><button className="emergency-button" onClick={openEmergency} aria-label="Darurat: nomor telepon penting"><PhoneCall size={18} aria-hidden="true"/><span>Darurat</span></button><button className="icon-button mobile-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'Tutup menu':'Buka menu'} aria-expanded={menu} aria-controls="main-menu">{menu?<X/>:<Menu/>}</button></div></div>
  <nav id="main-menu" className={'main-nav '+(menu?'open':'')} aria-label="Menu utama"><div className="container main-nav-inner">{groups.map(g=>g.items?<React.Fragment key={g.label}><Dropdown group={g} path={path}/><div className="mobile-group"><span>{g.label}</span>{g.items.map(([h,l])=><MenuLink key={h} href={h} label={l} path={path} onPick={()=>setMenu(false)}/>)}</div></React.Fragment>:<MenuLink key={g.href} href={g.href} label={g.label} path={path} onPick={()=>setMenu(false)}/>)}</div></nav>
 </header>
 <main id="content">{path==='/'?<Home data={data}/>:<PublicPages path={path} data={data}/>}</main>
 <footer className="footer"><div className="container footer-grid"><div><Link href="/" className="brand"><span className="brand-mark">M<span>m</span></span><span><small>PORTAL DIGITAL DESA</small><strong>{s.name}</strong></span></Link><p>{s.footer}</p></div><div><h3>Jelajahi desa</h3><div className="footer-links">{groups.flatMap(g=>g.items?g.items.filter(([h])=>h!=='darurat'):[[g.href,g.label]]).filter(([h])=>h!=='/').map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</div></div><div><h3>Hubungi kami</h3><p><MapPin size={16}/>{s.address}</p>{s.phone&&<a href={'tel:'+s.phone}><Phone size={16}/>{s.phone}</a>}{s.email&&<a href={'mailto:'+s.email}><Mail size={16}/>{s.email}</a>}<p><Clock size={16}/>{s.hours}</p><button className="footer-emergency" onClick={openEmergency}><PhoneCall size={16}/>Nomor darurat</button></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {s.identity}</span><button onClick={()=>setCredits(true)}>Sumber & kredit foto</button><Link href="/admin">Pengelolaan website</Link></div>{s.demo&&<div className="demo-note container">{s.demoNote}</div>}</footer>
 {credits&&<Modal title="Sumber & kredit foto" onClose={()=>setCredits(false)}><p className="small">Foto Kantor Desa dan Kantor Kecamatan merupakan foto asli dari Wikimedia Commons. Foto lain adalah ilustrasi, bukan dokumentasi Desa Marga Mulya. Salinan olahan mengikuti lisensi masing-masing.</p><ul className="credits-list">{(s.credits||[]).map((c,i)=><li key={i}><strong>{c.title}</strong><p>{c.author}</p><a href={c.source} target="_blank" rel="noreferrer">Sumber foto</a> · <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a></li>)}</ul><p className="small">Peta: © kontributor OpenStreetMap (ODbL). Cuaca: Open-Meteo (CC BY 4.0).</p><p className="small"><a href={s.sourceUrl} target="_blank" rel="noreferrer">Struktur data dari panitia EcoQuest</a></p></Modal>}
 <Assistant portal={data.portal} site={s}/><EmergencySheet contacts={data.portal.emergency}/>
 </>;
}
createRoot(document.getElementById('root')).render(<App/>);

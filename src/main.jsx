import React,{useEffect,useState} from 'react';import{createRoot}from'react-dom/client';
import{Menu,X,MapPin,CalendarDays,Store,Landmark,Mail,Phone,ShieldCheck,Clock,ChevronRight}from'lucide-react';
import{api,Link,useRoute,Picture,Busy,Notice,dateLabel,Modal}from'./lib.jsx';
import PublicPages,{Home}from'./pages.jsx';
import Admin from'./admin.jsx';
import './style.css';
function App(){
 const[data,setData]=useState(null),[error,setError]=useState(''),[menu,setMenu]=useState(false),[credits,setCredits]=useState(false);const path=useRoute();
 const refresh=()=>api('/content').then(x=>{setData(x);setError('');}).catch(e=>setError(e.message));useEffect(()=>{refresh();},[]);useEffect(()=>{setMenu(false);},[path]);
 if(path==='/admin')return <Admin refreshPublic={refresh}/>;
 if(error)return <main className="container"><Notice error>{error}</Notice><button className="button" onClick={refresh}>Coba lagi</button></main>;
 if(!data)return <Busy/>;const{site:s}=data;
 const nav=Object.entries(s.nav);
 return <><a className="skip-link" href="#content">Lewati ke konten</a>
 <div className="topbar"><div className="container topbar-inner"><span>{s.area}</span><div><span>{s.demo?'Versi demonstrasi EcoQuest':'Portal informasi desa'}</span><Link href="/admin"><ShieldCheck size={14}/>Admin</Link></div></div></div>
 <header className="header"><div className="container header-inner"><Link href="/" className="brand"><span className="brand-mark">M<span>m</span></span><span><small>DESA</small><strong>{s.name}</strong></span></Link><button className="icon-button mobile-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'Tutup menu':'Buka menu'} aria-expanded={menu}>{menu?<X/>:<Menu/>}</button><nav className={menu?'open':''} aria-label="Menu utama">{nav.map(([key,label])=><Link key={key} href={key==='home'?'/':'/'+key} className={path===(key==='home'?'/':'/'+key)?'active':''}>{label}</Link>)}</nav></div></header>
 <main id="content">{path==='/'?<Home data={data}/>:<PublicPages path={path} data={data} refresh={refresh}/>}</main>
 <footer className="footer"><div className="container footer-grid"><div><Link href="/" className="brand"><span className="brand-mark">M<span>m</span></span><span><small>DESA</small><strong>{s.name}</strong></span></Link><p>{s.footer}</p></div><div><h3>Jelajahi desa</h3><div className="footer-links">{nav.filter(([k])=>k!=='home').map(([k,l])=><Link key={k} href={'/'+k}>{l}</Link>)}</div></div><div><h3>Hubungi kami</h3><p><MapPin size={16}/>{s.address}</p>{s.phone&&<a href={'tel:'+s.phone}><Phone size={16}/>{s.phone}</a>}{s.email&&<a href={'mailto:'+s.email}><Mail size={16}/>{s.email}</a>}<p><Clock size={16}/>{s.hours}</p></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {s.identity}</span><button onClick={()=>setCredits(true)}>Sumber & kredit foto</button><Link href="/admin">Pengelolaan website</Link></div>{s.demo&&<div className="demo-note container">{s.demoNote}</div>}</footer>
 {credits&&<Modal title="Sumber & kredit foto" onClose={()=>setCredits(false)}><p className="small">Foto digunakan sebagai ilustrasi, bukan dokumentasi Desa Marga Mulya. Foto diperkecil, dikonversi ke WebP, dan dapat dipotong dalam tata letak. Salinan olahan mengikuti lisensi masing-masing.</p><ul className="credits-list">{(s.credits||[]).map((c,i)=><li key={i}><strong>{c.title}</strong><p>{c.author}</p><a href={c.source} target="_blank" rel="noreferrer">Sumber foto</a> · <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a></li>)}</ul><p className="small"><a href={s.sourceUrl} target="_blank" rel="noreferrer">Struktur data dari panitia EcoQuest</a></p></Modal>}
 </>;
}
createRoot(document.getElementById('root')).render(<App/>);

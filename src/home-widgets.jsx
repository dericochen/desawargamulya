// Homepage widgets: quick access, Open-Meteo weather card and the gallery carousel with lightbox.
import React,{useEffect,useRef,useState} from 'react';
import {Sun,Moon,CloudSun,Cloud,CloudFog,CloudDrizzle,CloudRain,CloudLightning,Droplets,Wind,Megaphone,MessageCircle,TreePalm,HardHat,Map as MapIcon,PhoneCall,ChevronLeft,ChevronRight,Umbrella,Pause,Play} from 'lucide-react';
import {Link,Modal,Picture,Slides,PhotoCount,imagesOf,openAssistant,openEmergency,dateLabel} from './lib.jsx';

// Homepage hero slideshow: crossfade every 6 s, pauses on hover/focus/touch, can be paused by the visitor, honours reduced motion.
export function HeroSlider({site:s}){
  const slides=(s.heroSlides?.length?s.heroSlides:[{image:s.heroImage,caption:s.heroCaption}]).filter(x=>x.image);
  const [i,setI]=useState(0),[hover,setHover]=useState(false),[stopped,setStopped]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{if(stopped||hover||slides.length<2)return;const t=setInterval(()=>{if(document.visibilityState==='visible')setI(n=>(n+1)%slides.length);},6000);return()=>clearInterval(t);},[stopped,hover,slides.length]);
  const go=n=>setI((n+slides.length)%slides.length);
  const buttons=(s.heroButtons||[]).filter(b=>b.label&&b.href);
  return <section className="hero" aria-roledescription="carousel" aria-label="Foto utama desa" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onTouchStart={()=>setHover(true)}>
    {slides.map((x,n)=><div key={n} className={'hero-slide '+(n===i?'active':'')} aria-hidden={n!==i}>{n===0?<Picture src={x.image} alt={x.caption} className="hero-photo"/>:<img src={x.image} alt={x.caption} className="hero-photo" loading={n===1?'eager':'lazy'} decoding="async"/>}</div>)}
    <div className="hero-shade"/>
    <div className="container hero-content"><span className="eyebrow light">{s.identity}</span><h1>{s.heroTitle.split('\n').map((l,n)=><React.Fragment key={n}>{l}<br/></React.Fragment>)}</h1><p>{s.heroText}</p>
      {buttons.length>0&&<div className="hero-actions">{buttons.map((b,n)=><Link key={n} className={'button '+(n===0?'gold':'transparent')} href={b.href}>{b.label}</Link>)}</div>}
      <span className="photo-credit" aria-live="polite">{slides[i]?.caption}</span>
      {slides.length>1&&<div className="hero-controls"><button type="button" className="hero-control" aria-label="Foto sebelumnya" onClick={()=>go(i-1)}><ChevronLeft/></button><div className="hero-dots">{slides.map((_,n)=><button type="button" key={n} aria-label={`Tampilkan foto ${n+1} dari ${slides.length}`} aria-current={n===i?'true':undefined} onClick={()=>setI(n)}/>)}</div><button type="button" className="hero-control" aria-label="Foto berikutnya" onClick={()=>go(i+1)}><ChevronRight/></button><button type="button" className="hero-control" aria-label={stopped?'Putar slide otomatis':'Hentikan slide otomatis'} onClick={()=>setStopped(!stopped)}>{stopped?<Play/>:<Pause/>}</button></div>}
    </div>
  </section>;
}

export function QuickAccess({site}){
  const items=[[Megaphone,'Pengaduan','/pengaduan'],[MessageCircle,'Tanya Desa',openAssistant],[TreePalm,site.nav.wisata||'Wisata','/wisata'],[HardHat,site.nav.pembangunan||'Pembangunan','/transparansi?tab=pembangunan'],[MapIcon,site.nav['peta-desa']||'Peta Desa','/peta-desa'],[PhoneCall,'Darurat',openEmergency]];
  return <nav className="container quick-access" aria-label="Akses cepat layanan">{items.map(([Icon,label,to])=>typeof to==='string'
    ?<Link key={label} href={to}><Icon aria-hidden="true"/><span>{label}</span></Link>
    :<button key={label} className={label==='Darurat'?'is-emergency':''} onClick={()=>to()}><Icon aria-hidden="true"/><span>{label}</span></button>)}</nav>;
}

// WMO weather codes (Open-Meteo) → Indonesian label and icon.
function describe(code,isDay=1){
  if(code===0)return ['Cerah',isDay?Sun:Moon];
  if(code<=2)return [code===1?'Cerah berawan':'Berawan sebagian',isDay?CloudSun:Cloud];
  if(code===3)return ['Berawan',Cloud];
  if(code===45||code===48)return ['Berkabut',CloudFog];
  if(code>=51&&code<=57)return ['Gerimis',CloudDrizzle];
  if(code>=61&&code<=67)return [code===61?'Hujan ringan':code===65?'Hujan lebat':'Hujan',CloudRain];
  if(code>=80&&code<=82)return [code===82?'Hujan lebat':'Hujan lokal',CloudRain];
  if(code>=95)return ['Badai petir',CloudLightning];
  return ['Berawan',Cloud];
}
export function Weather({lat,lng,timeZone,place=''}){
  const [state,setState]=useState({status:'loading'});
  useEffect(()=>{
    const key='mm_weather_'+lat+','+lng;
    try{const cached=JSON.parse(sessionStorage.getItem(key)||'null');if(cached&&Date.now()-cached.at<20*60000)return setState({status:'ready',data:cached.data});}catch{}
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(timeZone)}&forecast_days=3`;
    fetch(url,{signal:ctrl.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!data.current)throw new Error();try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),data}));}catch{}setState({status:'ready',data});}).catch(()=>setState({status:'error'})).finally(()=>clearTimeout(timer));
    return()=>{ctrl.abort();clearTimeout(timer);};
  },[lat,lng,timeZone]);
  if(state.status==='loading')return <aside className="weather-card" aria-busy="true"><h3>Cuaca Marga Mulya</h3><div className="skeleton weather-skeleton"/><p className="small muted">Memuat data cuaca…</p></aside>;
  if(state.status==='error')return <aside className="weather-card"><h3><Cloud size={18} aria-hidden="true"/>Cuaca Marga Mulya</h3><p className="weather-error">Data cuaca sementara tidak tersedia.</p><p className="small muted">{place}</p></aside>;
  const {current:c,daily:d}=state.data,[label,Icon]=describe(c.weather_code,c.is_day);
  return <aside className="weather-card" aria-labelledby="weather-title">
    <h3 id="weather-title"><Icon size={18} aria-hidden="true"/>Cuaca Marga Mulya</h3>
    <div className="weather-now"><strong>{Math.round(c.temperature_2m)}°C</strong><span>{label}</span></div>
    <div className="weather-meta"><span><Droplets size={16} aria-hidden="true"/>Kelembapan {c.relative_humidity_2m}%</span><span><Wind size={16} aria-hidden="true"/>Angin {Math.round(c.wind_speed_10m)} km/jam</span></div>
    <ul className="weather-days">{d.time.slice(0,3).map((day,i)=>{const [l,DayIcon]=describe(d.weather_code[i]);return <li key={day}><span>{['Hari ini','Besok','Lusa'][i]}</span><DayIcon size={18} aria-label={l}/><span>{Math.round(d.temperature_2m_max[i])}° / {Math.round(d.temperature_2m_min[i])}°</span>{d.precipitation_probability_max?.[i]!=null&&<span className="rain"><Umbrella size={13} aria-hidden="true"/>{d.precipitation_probability_max[i]}%</span>}</li>;})}</ul>
    <p className="small muted">{place&&place+' · '}Sumber: Open-Meteo</p>
  </aside>;
}

export function GalleryCarousel({items}){
  const track=useRef(),[paused,setPaused]=useState(false),[index,setIndex]=useState(-1);
  const scroll=dir=>{const t=track.current;if(!t)return;const atEnd=t.scrollLeft+t.clientWidth>=t.scrollWidth-4;t.scrollBy({left:dir>0&&atEnd?-t.scrollWidth:dir*t.clientWidth*.9,behavior:'smooth'});};
  useEffect(()=>{
    if(paused||items.length<2||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=setInterval(()=>{if(document.visibilityState==='visible')scroll(1);},6000);return()=>clearInterval(timer);
  },[paused,items.length]);
  if(!items.length)return null;
  const item=items[index];
  return <div className="carousel" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onTouchStart={()=>setPaused(true)} onPointerDown={()=>setPaused(true)}>
    <div className="carousel-track" ref={track} tabIndex={0} role="region" aria-label="Galeri desa, geser untuk melihat foto lain">{items.map((g,i)=><button key={g.id} className="carousel-item" onClick={()=>setIndex(i)}><Picture src={g.image} alt={g.description||g.title}/><PhotoCount n={imagesOf(g).length}/><span className="carousel-caption"><small>{g.category}</small>{g.title}</span></button>)}</div>
    <div className="carousel-controls"><button className="icon-button" aria-label="Foto sebelumnya" onClick={()=>{setPaused(true);scroll(-1);}}><ChevronLeft/></button><button className="icon-button" aria-label="Foto berikutnya" onClick={()=>{setPaused(true);scroll(1);}}><ChevronRight/></button></div>
    {item&&<Modal title={item.title} wide onClose={()=>setIndex(-1)}><Slides className="gallery-full" images={imagesOf(item)} alt={item.description||item.title}/><p className="gallery-caption">{item.description}</p><p className="credit">{item.category}{item.date&&' · '+dateLabel(item.date)}{item.imageCredit&&' · '+item.imageCredit}</p>
      {items.length>1&&<div className="form-actions lightbox-nav"><button className="button secondary" onClick={()=>setIndex((index-1+items.length)%items.length)}><ChevronLeft/>Sebelumnya</button><span className="small muted">{index+1} / {items.length}</span><button className="button secondary" onClick={()=>setIndex((index+1)%items.length)}>Berikutnya<ChevronRight/></button></div>}</Modal>}
  </div>;
}

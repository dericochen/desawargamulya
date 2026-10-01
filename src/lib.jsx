import React,{useEffect,useRef,useState,useId} from 'react';
import {X,ImageOff,LoaderCircle,ChevronLeft,ChevronRight,ImagePlus,Trash2,Images} from 'lucide-react';
import {validCoordinates,serviceHref} from './tourism-utils.js';
export async function api(path,options={}){
  const response=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options,body:options.body?JSON.stringify(options.body):undefined});
  const value=await response.json();if(!response.ok)throw new Error(value.error||'Permintaan gagal.');return value;
}
export const dateLabel=(s,opts={})=>s?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',...opts}).format(new Date(s+'T12:00:00')):'';
export const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
export const statusLabel={published:'Terbit',pending:'Menunggu peninjauan',draft:'Draf',revision:'Perlu perbaikan',rejected:'Ditolak',archived:'Diarsipkan'};
export const today=(timeZone='Asia/Jakarta')=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function Picture({src,alt='',className='',...props}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return src&&!failed?<img src={src} alt={alt} className={className} onError={()=>setFailed(true)} loading={className==='hero-photo'?'eager':'lazy'} fetchpriority={className==='hero-photo'?'high':undefined} decoding="async" {...props}/>:<div className={'image-missing '+className}><ImageOff/><span>Foto belum tersedia</span></div>;}
export function Modal({title,children,onClose,wide=false,className=''}){
  const ref=useRef();useEffect(()=>{const el=ref.current,opener=document.activeElement;el.showModal();document.body.classList.add('modal-open');return()=>{document.body.classList.remove('modal-open');if(opener?.isConnected)opener.focus();};},[]);
  return <dialog ref={ref} className={'dialog '+(wide?'wide ':'')+className} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X/></button></div><div className="dialog-body">{children}</div></dialog>;
}
export function Field({label,help,children,...props}){return <label className="field"><span>{label}</span>{children||<input {...props}/>} {help&&<small>{help}</small>}</label>;}
export function Busy({text='Memuat informasi…'}){return <div className="busy" role="status"><LoaderCircle className="spin"/>{text}</div>;}
export function Empty({title='Belum ada informasi',text}){return <div className="empty"><h3>{title}</h3>{text&&<p>{text}</p>}</div>;}
export function Notice({children,error=false}){return children?<div className={'notice '+(error?'error':'')} role={error?'alert':'status'}>{children}</div>:null;}
export async function fileImage(file){
  if(!file)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Pilih gambar JPG, PNG, atau WebP.');
  if(file.size>8e6)throw new Error('Ukuran foto maksimal 8 MB sebelum diperkecil.');
  const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');const scale=Math.min(1,1300/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/webp',.8);
}
export function ImageField({value,onChange,label='Foto',credit,onCredit}){const[err,setErr]=useState('');const inputId=useId();return <div className="field"><label className="image-upload-label" htmlFor={inputId}>{label}</label>{value&&<Picture src={value} className="upload-preview" alt="Pratinjau foto"/>}<input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{try{setErr('');onChange(await fileImage(e.target.files[0]));}catch(x){setErr(x.message);}}}/><small>JPG, PNG, atau WebP. Gambar diperkecil otomatis untuk website.</small><Notice error>{err}</Notice>{onCredit&&<Field label="Sumber / keterangan foto" value={credit||''} onChange={e=>onCredit(e.target.value)}/>}</div>;}
// All photos of an item: records use images[], portal rows use <field> + <field>_more. The first photo is the cover.
export const imagesOf=(item,key='image')=>{if(!item)return [];if(key==='image'&&Array.isArray(item.images)&&item.images.length)return item.images.filter(Boolean);return [item[key],...(Array.isArray(item[key+'_more'])?item[key+'_more']:[])].filter(Boolean);};
export const PhotoCount=({n})=>n>1?<span className="photo-count"><Images size={14} aria-hidden="true"/>{n} foto</span>:null;
// Swipeable photo slider (scroll-snap) with arrows, dots and keyboard support. One photo renders as a plain image.
export function Slides({images,alt='',className='',captions=[]}){
  const list=(images||[]).filter(Boolean),ref=useRef(),[i,setI]=useState(0);
  useEffect(()=>{if(ref.current)ref.current.scrollLeft=0;setI(0);},[list.join('|')]);
  if(!list.length)return <Placeholder className={className}/>;
  if(list.length===1)return <><Picture src={list[0]} alt={alt} className={className}/>{captions[0]&&<p className="credit">{captions[0]}</p>}</>;
  const go=n=>{const el=ref.current;if(!el)return;const k=(n+list.length)%list.length;el.scrollTo({left:k*el.clientWidth,behavior:'smooth'});};
  return <div className={'slides '+className} role="region" aria-roledescription="carousel" aria-label={'Foto '+alt}>
    <div className="slides-track" ref={ref} tabIndex={0} aria-label="Geser untuk melihat foto lain" onScroll={e=>{const el=e.currentTarget;setI(Math.round(el.scrollLeft/Math.max(1,el.clientWidth)));}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();go(i+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(i-1);}}}>
      {list.map((src,n)=><figure className="slide" key={n} aria-label={`Foto ${n+1} dari ${list.length}`}><Picture src={src} alt={`${alt} (foto ${n+1})`}/>{captions[n]&&<figcaption>{captions[n]}</figcaption>}</figure>)}
    </div>
    <button type="button" className="slides-nav prev" aria-label="Foto sebelumnya" onClick={()=>go(i-1)}><ChevronLeft/></button><button type="button" className="slides-nav next" aria-label="Foto berikutnya" onClick={()=>go(i+1)}><ChevronRight/></button>
    <div className="slides-dots">{list.map((_,n)=><button type="button" key={n} aria-label={`Tampilkan foto ${n+1}`} aria-current={i===n?'true':undefined} onClick={()=>go(n)}/>)}</div>
    <span className="slides-count" aria-live="polite">{i+1} / {list.length}</span>
  </div>;
}
// Upload up to `max` photos; first photo is the cover. Photos can be reordered or removed before saving.
export function MultiImageField({label='Foto',values,onChange,max=3,help,required=false}){
  const [err,setErr]=useState(''),[busy,setBusy]=useState(false),id=useId();const list=(values||[]).filter(Boolean);
  const add=async files=>{setErr('');setBusy(true);try{const room=max-list.length,picked=[...files].slice(0,room);if(files.length>room)setErr(`Maksimal ${max} foto. ${files.length-room} foto tidak ditambahkan.`);const out=[];for(const f of picked)out.push(await fileImage(f));onChange([...list,...out]);}catch(x){setErr(x.message);}finally{setBusy(false);}};
  const move=(n,d)=>{const a=[...list];[a[n],a[n+d]]=[a[n+d],a[n]];onChange(a);};
  return <div className="field multi-image" role="group" aria-labelledby={id}><span className="image-upload-label" id={id}>{label}{required&&' (wajib)'}</span>
    {list.length>0&&<ul className="thumb-list">{list.map((src,n)=><li key={n}><Picture src={src} alt={`Pratinjau foto ${n+1}`}/>{n===0&&<span className="thumb-badge">Sampul</span>}<div className="thumb-actions"><button type="button" className="icon-button" aria-label={`Geser foto ${n+1} ke kiri`} disabled={n===0} onClick={()=>move(n,-1)}><ChevronLeft/></button><button type="button" className="icon-button" aria-label={`Geser foto ${n+1} ke kanan`} disabled={n===list.length-1} onClick={()=>move(n,1)}><ChevronRight/></button><button type="button" className="icon-button danger-text" aria-label={`Hapus foto ${n+1}`} onClick={()=>onChange(list.filter((_,m)=>m!==n))}><Trash2/></button></div></li>)}</ul>}
    {list.length<max&&<label className="button secondary upload-button"><ImagePlus aria-hidden="true"/>{busy?'Memproses foto…':list.length?'Tambah foto':'Pilih foto'}<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{add(e.target.files);e.target.value='';}}/></label>}
    <small>{help||'JPG, PNG, atau WebP. Foto pertama menjadi sampul dan semua foto dapat digeser di halaman pengunjung.'} {list.length}/{max} foto.</small><Notice error>{err}</Notice>
  </div>;
}
// Scroll-reveal animation: fades/raises content as it enters the viewport. Skipped for reduced-motion users;
// without JS or IntersectionObserver nothing is hidden. New nodes (tabs, filters) are picked up by a MutationObserver.
const revealSelector='.section-heading,.product-card,.tourism-card,.project-card,.article-card,.aid-card,.data-section,.data-summary>div,.chart-grid>.panel,.quick-access>*,.gallery-grid>button,.agenda-card,.faq-item,.service-actions>button,.contact-list>div,.contact-map,.weather-card,.stats-grid>div,.location-list li,.news-feature,.event-row,.profile-brief,.home-contact>*,.registration-option,.map-filters,.track-panel,.complaint-form,.still-help';
export function useReveal(){useEffect(()=>{
  if(typeof IntersectionObserver==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.documentElement.classList.add('motion');
  const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}},{rootMargin:'0px 0px -6% 0px',threshold:.06});
  const scan=root=>{if(!root?.querySelectorAll)return;const list=[...(root.matches?.(revealSelector)?[root]:[]),...root.querySelectorAll(revealSelector)];for(const el of list){if(el.dataset.reveal||el.closest('dialog,.admin-shell,.village-map'))continue;el.dataset.reveal='1';const i=[...el.parentElement.children].indexOf(el);el.style.setProperty('--reveal-delay',Math.min(Math.max(i,0),5)*70+'ms');el.classList.add('reveal');io.observe(el);}};
  scan(document.body);
  const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)scan(n);});
  mo.observe(document.getElementById('root'),{childList:true,subtree:true});
  return()=>{io.disconnect();mo.disconnect();};
},[]);}
// Counts up to a number (Indonesian formatting such as 2.846) once it becomes visible; other values render as-is.
export function CountUp({value}){
  const raw=String(value??''),m=raw.match(/^\d{1,3}(?:\.\d{3})*$|^\d+$/),target=m?Number(raw.replace(/\./g,'')):null;
  const ref=useRef(),[shown,setShown]=useState(target===null?raw:raw);
  useEffect(()=>{
    if(target===null||typeof IntersectionObserver==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(raw);return;}
    setShown('0');let frame;const io=new IntersectionObserver(([e])=>{if(!e.isIntersecting)return;io.disconnect();const start=performance.now(),dur=1200;
      const tick=t=>{const p=Math.min(1,(t-start)/dur),v=Math.round(target*(1-Math.pow(1-p,3)));setShown(new Intl.NumberFormat('id-ID').format(v));if(p<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);},{threshold:.4});
    io.observe(ref.current);return()=>{io.disconnect();cancelAnimationFrame(frame);};
  },[raw]);
  return <span ref={ref} className="count-up"><span aria-hidden="true">{shown}</span><span className="sr-only">{raw}</span></span>;
}
// Village logo from the CMS; falls back to the monogram.
export function BrandMark({site}){return site?.logo?<img className="brand-logo" src={site.logo} alt={'Logo '+(site.identity||'desa')} width="48" height="48"/>:<span className="brand-mark" aria-hidden="true">M<span>m</span></span>;}
export function PageIntro({eyebrow,title,children,action}){return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children&&<p>{children}</p>}</div>{action}</div>;}
export function useRoute(){const[path,setPath]=useState(location.pathname+location.search);useEffect(()=>{let last=location.pathname;const f=()=>{setPath(location.pathname+location.search);if(location.pathname!==last)window.scrollTo(0,0);last=location.pathname;};window.addEventListener('popstate',f);return()=>window.removeEventListener('popstate',f);},[]);return path.split('?')[0];}
export function Link({href,children,onClick,...props}){return <a href={href} {...props} onClick={e=>{if(onClick)onClick(e);if(!e.defaultPrevented&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0&&href.startsWith('/')){e.preventDefault();history.pushState(null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));}}}>{children}</a>;}
export const navigate=href=>{history.pushState(null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));};
// Global sheets (emergency numbers, village assistant) are opened from many places via window events.
export const openEmergency=()=>window.dispatchEvent(new Event('mm:emergency'));
export const openAssistant=(detail={})=>window.dispatchEvent(new CustomEvent('mm:assistant',{detail}));
export const openSearch=(q='')=>window.dispatchEvent(new CustomEvent('mm:search',{detail:{q}}));
// Tabs that live inside one public page (keeps the site within the 10-page limit). State is kept in ?tab=.
export function HubTabs({tabs,active,label}){
 const refs=useRef([]);const select=k=>{if(active!==k)navigate(location.pathname+'?tab='+k);};
 return <div className="tabs hub-tabs" role="tablist" aria-label={label}>{tabs.map(([k,l],i)=><button ref={el=>refs.current[i]=el} key={k} role="tab" id={'hub-tab-'+k} tabIndex={active===k?0:-1} aria-selected={active===k} aria-controls="hub-panel" onClick={()=>select(k)} onKeyDown={e=>{const n=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;if(n<0)return;e.preventDefault();refs.current[n]?.focus();select(tabs[n][0]);}}>{l}</button>)}</div>;
}
export const isActiveHref=(href,path)=>{const [p,q]=href.split('?');if(p!==path)return false;if(!q)return !new URLSearchParams(location.search).get('tab');const want=new URLSearchParams(q),have=new URLSearchParams(location.search);return [...want].every(([k,v])=>have.get(k)===v);};
export const telHref=phone=>'tel:'+String(phone).replace(/[^\d+]/g,'');
export const directionsUrl=(lat,lng)=>`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const numberLabel=n=>new Intl.NumberFormat('id-ID').format(n||0);
export const timeLabel=(iso,timeZone='Asia/Jakarta')=>{const d=new Date(iso),same=new Intl.DateTimeFormat('en-CA',{timeZone}).format(d)===new Intl.DateTimeFormat('en-CA',{timeZone}).format(new Date());return new Intl.DateTimeFormat('id-ID',same?{timeZone,hour:'2-digit',minute:'2-digit'}:{timeZone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);};
export const param=name=>new URLSearchParams(location.search).get(name)||'';
const MapLazy=React.lazy(()=>import('./map.jsx'));
export function MapView(props){return <React.Suspense fallback={<div className={'map-shell map-loading '+(props.className||'')}><Busy text="Memuat peta…"/></div>}><MapLazy {...props}/></React.Suspense>;}
// Renders children only once the placeholder scrolls near the viewport (used to defer the homepage map).
export function WhenVisible({children,minHeight=300}){const ref=useRef(),[shown,setShown]=useState(typeof IntersectionObserver==='undefined');useEffect(()=>{if(shown)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setShown(true);o.disconnect();}},{rootMargin:'300px'});o.observe(ref.current);return()=>o.disconnect();},[shown]);return shown?children:<div ref={ref} style={{minHeight}}/>;}
export function mapPoints(portal){
  return [
    ...portal.tourism.map(t=>({id:t.id,name:t.name,category:'wisata',address:t.address,lat:t.latitude,lng:t.longitude,image:t.cover_image,href:'/wisata?lihat='+t.slug,status:t.data_status})),
    ...(portal.stays||[]).filter(t=>validCoordinates(t.latitude,t.longitude)).map(t=>({id:t.id,name:t.name,category:'penginapan',address:t.area,lat:t.latitude,lng:t.longitude,image:t.cover_image,href:serviceHref('stay',t),status:t.data_status})),
    ...(portal.guides||[]).filter(t=>validCoordinates(t.latitude,t.longitude)).map(t=>({id:t.id,name:t.name,category:'pemandu',address:t.area,lat:t.latitude,lng:t.longitude,image:t.cover_image,href:serviceHref('guide',t),status:t.data_status})),
    ...portal.facilities.map(f=>({id:f.id,name:f.name,category:f.category,address:f.address,lat:f.latitude,lng:f.longitude,image:f.image_url,status:f.data_status}))
  ];
}
// Data status label (competition feedback: never let demo or estimated data look official).
export const dataStatusInfo={perlu_verifikasi:['⚠','Perlu verifikasi','Lokasi atau keterangan masih perkiraan dan belum diverifikasi pemerintah desa.','warn'],terverifikasi:['✓','Terverifikasi desa','Sudah diperiksa pemerintah desa.','ok'],sumber_pemerintah:['✓','Sumber pemerintah','Diambil dari data resmi pemerintah.','gov'],demo:['◇','Data contoh','Contoh untuk demonstrasi, bukan data resmi desa.','demo']};
export function DataBadge({status,long=false}){const d=dataStatusInfo[status];if(!d)return null;return <span className={'data-badge '+d[3]} title={d[2]}><span aria-hidden="true">{d[0]}</span> {d[1]}{long&&<span className="data-badge-note"> — {d[2]}</span>}</span>;}
export function Placeholder({label='Foto belum tersedia',className=''}){return <div className={'photo-placeholder '+className} role="img" aria-label={label}><svg viewBox="0 0 120 40" aria-hidden="true"><path d="M0 28c10-6 20-6 30 0s20 6 30 0 20-6 30 0 20 6 30 0v12H0z"/><path d="M0 34c10-5 20-5 30 0s20 5 30 0 20-5 30 0 20 5 30 0v6H0z"/></svg><span>{label}</span></div>;}
export function Photo({src,alt,className=''}){return src?<Picture src={src} alt={alt} className={className}/>:<Placeholder className={className}/>;}
export function Progress({value,label='Progres'}){return <div className="progress"><div className="progress-top"><span>{label}</span><strong>{value}%</strong></div><div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{width:Math.max(0,Math.min(100,value))+'%'}}/></div></div>;}
export const Unknown=({children})=>children?<>{children}</>:<span className="unknown">Informasi belum tersedia</span>;

import React,{useEffect,useRef,useState,useId} from 'react';
import {X,ImageOff,LoaderCircle} from 'lucide-react';
export async function api(path,options={}){
  const response=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options,body:options.body?JSON.stringify(options.body):undefined});
  const value=await response.json();if(!response.ok)throw new Error(value.error||'Permintaan gagal.');return value;
}
export const dateLabel=(s,opts={})=>s?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',...opts}).format(new Date(s+'T12:00:00')):'';
export const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
export const statusLabel={published:'Terbit',pending:'Menunggu peninjauan',draft:'Draf',revision:'Perlu perbaikan',rejected:'Ditolak',archived:'Diarsipkan'};
export const today=(timeZone='Asia/Jakarta')=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function Picture({src,alt='',className='',...props}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return src&&!failed?<img src={src} alt={alt} className={className} onError={()=>setFailed(true)} loading={className==='hero-photo'?'eager':'lazy'} {...props}/>:<div className={'image-missing '+className}><ImageOff/><span>Foto belum tersedia</span></div>;}
export function Modal({title,children,onClose,wide=false,className=''}){
  const ref=useRef();useEffect(()=>{const el=ref.current;el.showModal();document.body.classList.add('modal-open');return()=>document.body.classList.remove('modal-open');},[]);
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
export function PageIntro({eyebrow,title,children,action}){return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children&&<p>{children}</p>}</div>{action}</div>;}
export function useRoute(){const[path,setPath]=useState(location.pathname+location.search);useEffect(()=>{let last=location.pathname;const f=()=>{setPath(location.pathname+location.search);if(location.pathname!==last)window.scrollTo(0,0);last=location.pathname;};window.addEventListener('popstate',f);return()=>window.removeEventListener('popstate',f);},[]);return path.split('?')[0];}
export function Link({href,children,onClick,...props}){return <a href={href} {...props} onClick={e=>{if(onClick)onClick(e);if(!e.defaultPrevented&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0&&href.startsWith('/')){e.preventDefault();history.pushState(null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));}}}>{children}</a>;}
export const navigate=href=>{history.pushState(null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));};
// Global sheets (emergency numbers, village assistant) are opened from many places via window events.
export const openEmergency=()=>window.dispatchEvent(new Event('mm:emergency'));
export const openAssistant=(detail={})=>window.dispatchEvent(new CustomEvent('mm:assistant',{detail}));
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
    ...portal.tourism.map(t=>({id:t.id,name:t.name,category:'wisata',address:t.address,lat:t.latitude,lng:t.longitude,image:t.cover_image,href:'/wisata?lihat='+t.slug})),
    ...portal.facilities.map(f=>({id:f.id,name:f.name,category:f.category,address:f.address,lat:f.latitude,lng:f.longitude,image:f.image_url}))
  ];
}
export function Placeholder({label='Foto belum tersedia',className=''}){return <div className={'photo-placeholder '+className} role="img" aria-label={label}><svg viewBox="0 0 120 40" aria-hidden="true"><path d="M0 28c10-6 20-6 30 0s20 6 30 0 20-6 30 0 20 6 30 0v12H0z"/><path d="M0 34c10-5 20-5 30 0s20 5 30 0 20-5 30 0 20 5 30 0v6H0z"/></svg><span>{label}</span></div>;}
export function Photo({src,alt,className=''}){return src?<Picture src={src} alt={alt} className={className}/>:<Placeholder className={className}/>;}
export function Progress({value,label='Progres'}){return <div className="progress"><div className="progress-top"><span>{label}</span><strong>{value}%</strong></div><div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{width:Math.max(0,Math.min(100,value))+'%'}}/></div></div>;}
export const Unknown=({children})=>children?<>{children}</>:<span className="unknown">Informasi belum tersedia</span>;

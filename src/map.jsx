import React,{useEffect,useRef,useState} from 'react';
import {facilityCategories} from '../server/portal-schema.mjs';
import {directionsUrl,dataStatusInfo} from './lib.jsx';
import {validCoordinates} from './tourism-utils.js';
import {loadGoogleMaps,MAP_AUTH_EVENT,googleAuthFailed} from './map-loader.js';

const apiKey=import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId=import.meta.env.VITE_GOOGLE_MAPS_MAP_ID||'DEMO_MAP_ID';
const categories=Object.fromEntries(facilityCategories.map(([k,label,emoji])=>[k,{label,emoji}]));
const element=(tag,props={},children=[])=>{const n=document.createElement(tag);Object.assign(n,props);for(const c of children)if(c)n.append(c);return n;};
function pin(p){const info=categories[p.category]||categories.lainnya;return element('span',{className:'map-marker'},[element('span',{className:'map-pin pin-'+(p.category in categories?p.category:'lainnya')},[element('span',{textContent:info.emoji})])]);}
function popup(p){
 const info=categories[p.category]||categories.lainnya;
 const links=[element('a',{className:'button map-popup-button',href:directionsUrl(p.lat,p.lng),target:'_blank',rel:'noreferrer',textContent:'Petunjuk arah'})];
 if(p.href&&/^\/(?!\/)/.test(p.href)){const a=element('a',{className:'plain-link',href:p.href,textContent:'Lihat detail'});a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState(null,'',p.href);window.dispatchEvent(new PopStateEvent('popstate'));});links.push(a);}
 return element('div',{className:'map-popup'},[p.image&&element('img',{className:'map-popup-image',src:p.image,alt:'',loading:'lazy'}),element('span',{className:'map-popup-category',textContent:info.emoji+' '+info.label}),element('strong',{textContent:p.name}),dataStatusInfo[p.status]&&element('span',{className:'data-badge '+dataStatusInfo[p.status][3],textContent:dataStatusInfo[p.status][1]}),p.address&&element('p',{textContent:p.address}),element('div',{className:'map-popup-actions'},links)]);
}
export default function VillageMap({points=[],center,zoom=14,focusId,label='Peta interaktif desa',className=''}){
 const node=useRef(),shell=useRef(),adapter=useRef(),latest=useRef();
 const [engine,setEngine]=useState(apiKey&&!googleAuthFailed()?'google':'osm'),[status,setStatus]=useState('loading'),[attempt,retry]=useState(0),[expanded,setExpanded]=useState(false);
 const safeCenter=validCoordinates(center?.[0],center?.[1])?center:[-6.0353563,106.5260001];
 latest.current={points:points.filter(p=>validCoordinates(p.lat,p.lng)),center:safeCenter,zoom,focusId};
 const draw=()=>adapter.current?.draw(latest.current);
 useEffect(()=>{
  let cancelled=false,cleanup=()=>{},timer;const active=()=>!cancelled;
  setStatus('loading');
  const fallback=()=>{if(active())setEngine('osm');};
  window.addEventListener(MAP_AUTH_EVENT,fallback);
  const resize=new ResizeObserver(()=>adapter.current?.resize());resize.observe(node.current);
  (async()=>{
   if(engine==='google'){
    const maps=await loadGoogleMaps(apiKey);if(!active()||googleAuthFailed())return fallback();
    const {center,zoom}=latest.current;
    const map=new maps.Map(node.current,{center:{lat:center[0],lng:center[1]},zoom,mapId,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});
    const info=new maps.InfoWindow({maxWidth:280});let markers=[],handlers=[];
    const clear=()=>{info.close();for(const off of handlers)off();handlers=[];for(const marker of markers){maps.event.clearInstanceListeners(marker);marker.map=null;}markers=[];};
    adapter.current={resize:()=>maps.event.trigger(map,'resize'),draw:({points,center,zoom,focusId})=>{
     clear();const bounds=new maps.LatLngBounds();let focused;
     for(const p of points){const marker=new maps.marker.AdvancedMarkerElement({map,position:{lat:p.lat,lng:p.lng},title:p.name,gmpClickable:true});marker.append(pin(p));const open=()=>{info.setContent(popup(p));info.open({map,anchor:marker});};marker.addEventListener('gmp-click',open);handlers.push(()=>marker.removeEventListener('gmp-click',open));markers.push(marker);bounds.extend(marker.position);if(p.id===focusId)focused={marker,p};}
     if(focused){map.setCenter(focused.marker.position);map.setZoom(16);info.setContent(popup(focused.p));info.open({map,anchor:focused.marker});}
     else if(points.length>1){map.fitBounds(bounds,50);maps.event.addListenerOnce(map,'idle',()=>{if(active()&&map.getZoom()>16)map.setZoom(16);});}
     else{map.setCenter(points.length?{lat:points[0].lat,lng:points[0].lng}:{lat:center[0],lng:center[1]});map.setZoom(zoom);}
    }};
    cleanup=()=>{clear();maps.event.clearInstanceListeners(map);};
    timer=setTimeout(fallback,10000);
    maps.event.addListenerOnce(map,'tilesloaded',()=>{if(active()){clearTimeout(timer);setStatus('ready');}});
    maps.event.addListener(map,'mapcapabilities_changed',()=>{if(map.getMapCapabilities?.().isAdvancedMarkersAvailable===false)fallback();});
    draw();
   }else{
    const [{default:L}]=await Promise.all([import('leaflet'),import('leaflet/dist/leaflet.css')]);if(!active())return;
    const {center,zoom}=latest.current;
    const map=L.map(node.current,{scrollWheelZoom:false,zoomControl:true}).setView(center,zoom);
    const group=L.featureGroup().addTo(map);
    map.on('popupopen',e=>{const close=e.popup.getElement()?.querySelector('.leaflet-popup-close-button');if(close){close.setAttribute('aria-label','Tutup rincian lokasi');close.title='Tutup rincian lokasi';}});
    let loaded=0,failed=0;
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'});
    tiles.on('tileload',()=>{loaded++;if(active()){clearTimeout(timer);setStatus('ready');}});
    tiles.on('tileerror',()=>{failed++;if(active()&&!loaded&&failed>=3)setStatus('error');});
    timer=setTimeout(()=>{if(active()&&!loaded)setStatus('error');},10000);
    tiles.addTo(map);
    const z=map.zoomControl.getContainer();z.querySelector('.leaflet-control-zoom-in')?.setAttribute('aria-label','Perbesar peta');z.querySelector('.leaflet-control-zoom-out')?.setAttribute('aria-label','Perkecil peta');
    adapter.current={resize:()=>map.invalidateSize({pan:false}),draw:({points,center,zoom,focusId})=>{
     group.clearLayers();let focused;
     for(const p of points){const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({html:pin(p),className:'village-leaflet-pin',iconSize:[36,42],iconAnchor:[18,42],popupAnchor:[0,-35]}),title:p.name,alt:p.name,keyboard:true}).bindPopup(popup(p),{maxWidth:280}).addTo(group);marker.getElement()?.setAttribute('aria-label',p.name);if(p.id===focusId)focused=marker;}
     if(focused){map.setView(focused.getLatLng(),16);focused.openPopup();}
     else if(points.length>1)map.fitBounds(group.getBounds(),{padding:[45,45],maxZoom:16});
     else map.setView(points.length?[points[0].lat,points[0].lng]:center,zoom);
    }};
    cleanup=()=>map.remove();draw();
   }
  })().catch(()=>{if(active()){if(engine==='google')fallback();else setStatus('error');}});
  return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener(MAP_AUTH_EVENT,fallback);resize.disconnect();adapter.current=null;cleanup();if(node.current)node.current.replaceChildren();};
 },[engine,attempt]);
 useEffect(draw,[points,focusId,center?.[0],center?.[1],zoom]);
 useEffect(()=>{
  const sync=()=>setExpanded(document.fullscreenElement===shell.current||shell.current?.classList.contains('expanded'));
  const esc=e=>{if(e.key==='Escape'){shell.current?.classList.remove('expanded');sync();adapter.current?.resize();}};
  document.addEventListener('fullscreenchange',sync);document.addEventListener('keydown',esc);
  return()=>{document.removeEventListener('fullscreenchange',sync);document.removeEventListener('keydown',esc);};
 },[]);
 async function fullscreen(){
  const el=shell.current;
  if(document.fullscreenElement===el)await document.exitFullscreen().catch(()=>{});
  else if(el.classList.contains('expanded'))el.classList.remove('expanded');
  else if(el.requestFullscreen)await el.requestFullscreen().catch(()=>el.classList.add('expanded'));
  else el.classList.add('expanded');
  setExpanded(document.fullscreenElement===el||el.classList.contains('expanded'));adapter.current?.resize();
 }
 const focused=latest.current.points.find(p=>p.id===focusId),external=focused?[focused.lat,focused.lng]:safeCenter;
 return <div ref={shell} className={'map-shell '+className} data-map-provider={engine}>
  <div ref={node} className="village-map" role="region" aria-label={label}/>
  <div className="map-tools">{engine==='google'&&<button className="map-switch" type="button" onClick={()=>setEngine('osm')} aria-label="Gunakan peta alternatif OpenStreetMap" title="Gunakan OpenStreetMap">OSM</button>}<button type="button" onClick={()=>{adapter.current?.draw({...latest.current,focusId:''});adapter.current?.resize();}} aria-label="Tampilkan semua lokasi" title="Tampilkan semua lokasi">◎</button><button type="button" onClick={fullscreen} aria-label={expanded?'Keluar dari layar penuh':'Tampilkan peta layar penuh'} aria-pressed={expanded}>⛶</button></div>
  {status==='loading'&&<div className="map-state" role="status"><span>Memuat peta…</span>{engine==='google'&&<button type="button" onClick={()=>setEngine('osm')}>Gunakan peta alternatif</button>}</div>}
  {status==='error'&&<div className="map-state map-state-error" role="status"><span>Peta belum dapat dimuat. Periksa koneksi atau buka lokasi langsung.</span><button type="button" onClick={()=>retry(n=>n+1)}>Coba lagi</button><a href={directionsUrl(...external)} target="_blank" rel="noreferrer">Buka Google Maps</a></div>}
  {engine==='osm'&&apiKey&&status==='ready'&&<div className="map-provider-note">Peta alternatif OpenStreetMap</div>}
 </div>;
}

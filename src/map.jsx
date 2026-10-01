// Interactive Google Maps map. Loaded lazily so pages without a map stay light.
import React,{useEffect,useRef} from 'react';
import {facilityCategories} from '../server/portal-schema.mjs';
import {directionsUrl,dataStatusInfo} from './lib.jsx';

const categoryInfo=Object.fromEntries(facilityCategories.map(([key,label,emoji])=>[key,{label,emoji}]));
const el=(tag,props={},children=[])=>{const n=document.createElement(tag);Object.assign(n,props);for(const c of [].concat(children))if(c)n.append(c);return n;};
const apiKey=import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load the Google Maps JS API exactly once, even when several maps mount on one page.
let mapsPromise=null;
function loadGoogleMaps(){
  if(typeof window!=='undefined'&&window.google?.maps)return Promise.resolve(window.google.maps);
  if(mapsPromise)return mapsPromise;
  mapsPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&v=weekly`;
    script.async=true;script.defer=true;
    script.addEventListener('load',()=>window.google?.maps?resolve(window.google.maps):reject(new Error('Google Maps gagal dimuat.')));
    script.addEventListener('error',()=>{mapsPromise=null;reject(new Error('Google Maps gagal dimuat.'));});
    document.head.appendChild(script);
  });
  return mapsPromise;
}

// Popup DOM is built with textContent (never innerHTML) so admin-entered text cannot inject markup.
function popupContent(p){
  const info=categoryInfo[p.category]||categoryInfo.lainnya;
  const links=[el('a',{className:'button map-popup-button',href:directionsUrl(p.lat,p.lng),target:'_blank',rel:'noreferrer',textContent:'Petunjuk Arah'})];
  if(p.href){const detail=el('a',{className:'plain-link',href:p.href,textContent:'Lihat detail'});detail.addEventListener('click',e=>{e.preventDefault();history.pushState(null,'',p.href);window.dispatchEvent(new PopStateEvent('popstate'));});links.push(detail);}
  return el('div',{className:'map-popup'},[
    p.image&&el('img',{src:p.image,alt:'',loading:'lazy',className:'map-popup-image'}),
    el('span',{className:'map-popup-category',textContent:info.emoji+' '+info.label}),
    el('strong',{textContent:p.name}),
    dataStatusInfo[p.status]&&el('span',{className:'data-badge '+dataStatusInfo[p.status][3],title:dataStatusInfo[p.status][2],textContent:dataStatusInfo[p.status][0]+' '+dataStatusInfo[p.status][1]}),
    p.address&&el('p',{textContent:p.address}),
    el('div',{className:'map-popup-actions'},links)
  ]);
}

// Emoji pin that mirrors the previous marker markup, so the existing CSS keeps styling it.
function pinElement(category){
  const info=categoryInfo[category]||categoryInfo.lainnya;
  const key=category in categoryInfo?category:'lainnya';
  return el('span',{className:'map-marker'},[el('span',{className:'map-pin pin-'+key},[el('span',{textContent:info.emoji})])]);
}

export default function VillageMap({points,center,zoom=14,focusId,label='Peta interaktif desa',className=''}){
  const node=useRef(),map=useRef(),info=useRef(),markers=useRef(new Map());
  useEffect(()=>{
    if(!apiKey)return;
    let cancelled=false;const listeners=[];
    loadGoogleMaps().then(maps=>{
      if(cancelled||!node.current)return;
      const m=new maps.Map(node.current,{center:{lat:center[0],lng:center[1]},zoom,disableDefaultUI:false,zoomControl:true,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});
      map.current=m;info.current=new maps.InfoWindow({maxWidth:260});

      // Custom fullscreen toggle: mirrors the old behaviour (requestFullscreen with an `expanded` fallback).
      const button=el('button',{type:'button',className:'map-fullscreen',textContent:'⛶'});
      const sync=()=>{const on=node.current?.closest('.map-shell')?.classList.contains('expanded')||!!document.fullscreenElement;button.title=button.ariaLabel=on?'Keluar dari layar penuh':'Tampilkan peta layar penuh';};
      button.addEventListener('click',async()=>{
        const shell=node.current?.closest('.map-shell');if(!shell)return;
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(shell.classList.contains('expanded'))shell.classList.remove('expanded');
        else if(shell.requestFullscreen)await shell.requestFullscreen().catch(()=>shell.classList.add('expanded'));
        else shell.classList.add('expanded');
        sync();setTimeout(()=>maps.event.trigger(m,'resize'),200);
      });
      const onFs=()=>{sync();setTimeout(()=>maps.event.trigger(m,'resize'),200);};
      document.addEventListener('fullscreenchange',onFs);listeners.push(['fullscreenchange',onFs]);
      sync();
      m.controls[maps.ControlPosition.TOP_RIGHT].push(button);

      drawMarkers(maps);
      focusMarker();
    }).catch(()=>{});
    return()=>{cancelled=true;for(const [ev,fn] of listeners)document.removeEventListener(ev,fn);if(map.current)google.maps?.event?.clearInstanceListeners?.(map.current);markers.current.clear();map.current=null;info.current=null;};
  },[]);

  function drawMarkers(maps){
    const m=map.current;if(!m)return;
    for(const marker of markers.current.values())marker.map=null;
    markers.current.clear();
    for(const p of points){
      if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))continue;
      // AdvancedMarkerElement renders arbitrary DOM (the emoji pin) without needing a map style/mapId
      // when a content element is supplied, so it is the least fragile way to keep the old look.
      const marker=new maps.marker.AdvancedMarkerElement({map:m,position:{lat:p.lat,lng:p.lng},content:pinElement(p.category),title:p.name+' — '+(categoryInfo[p.category]||categoryInfo.lainnya).label});
      marker.addListener('click',()=>{info.current.setContent(popupContent(p));info.current.open({map:m,anchor:marker});});
      markers.current.set(p.id,marker);
    }
  }
  function focusMarker(){
    const m=map.current,marker=focusId&&markers.current.get(focusId);
    if(m&&marker){const pos=marker.position;m.setCenter(pos);m.setZoom(16);info.current.setContent(popupContent(points.find(p=>p.id===focusId)));info.current.open({map:m,anchor:marker});}
  }

  useEffect(()=>{if(window.google?.maps&&map.current)drawMarkers(window.google.maps);},[points]);
  useEffect(()=>{if(window.google?.maps&&map.current)focusMarker();},[focusId,points]);

  if(!apiKey)return <div className={'map-shell '+className}><div className="map-fallback"><p>Peta tidak tersedia: kunci Google Maps belum dikonfigurasi.</p></div></div>;
  return <div className={'map-shell '+className}><div ref={node} className="village-map" role="region" aria-label={label}/></div>;
}

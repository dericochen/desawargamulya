// Interactive Leaflet + OpenStreetMap map. Loaded lazily so pages without a map stay light.
import React,{useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {facilityCategories} from '../server/portal-schema.mjs';
import {directionsUrl} from './lib.jsx';

const categoryInfo=Object.fromEntries(facilityCategories.map(([key,label,emoji])=>[key,{label,emoji}]));
const el=(tag,props={},children=[])=>{const n=document.createElement(tag);Object.assign(n,props);for(const c of [].concat(children))if(c)n.append(c);return n;};

// Popup DOM is built with textContent (never innerHTML) so admin-entered text cannot inject markup.
function popupContent(p){
  const info=categoryInfo[p.category]||categoryInfo.lainnya;
  const links=[el('a',{className:'button map-popup-button',href:directionsUrl(p.lat,p.lng),target:'_blank',rel:'noreferrer',textContent:'Petunjuk Arah'})];
  if(p.href){const detail=el('a',{className:'plain-link',href:p.href,textContent:'Lihat detail'});detail.addEventListener('click',e=>{e.preventDefault();history.pushState(null,'',p.href);window.dispatchEvent(new PopStateEvent('popstate'));});links.push(detail);}
  return el('div',{className:'map-popup'},[
    p.image&&el('img',{src:p.image,alt:'',loading:'lazy',className:'map-popup-image'}),
    el('span',{className:'map-popup-category',textContent:info.emoji+' '+info.label}),
    el('strong',{textContent:p.name}),
    p.address&&el('p',{textContent:p.address}),
    el('div',{className:'map-popup-actions'},links)
  ]);
}
const icon=category=>{const info=categoryInfo[category]||categoryInfo.lainnya;return L.divIcon({className:'map-marker',html:`<span class="map-pin pin-${category in categoryInfo?category:'lainnya'}" aria-hidden="true"><span>${info.emoji}</span></span>`,iconSize:[38,38],iconAnchor:[19,36],popupAnchor:[0,-32]});};

const FullscreenControl=L.Control.extend({
  options:{position:'topright'},
  onAdd(map){
    const button=L.DomUtil.create('button','map-fullscreen');button.type='button';button.textContent='⛶';
    const sync=()=>{const on=map.getContainer().closest('.map-shell').classList.contains('expanded');button.title=button.ariaLabel=on?'Keluar dari layar penuh':'Tampilkan peta layar penuh';};
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button,'click',async()=>{
      const shell=map.getContainer().closest('.map-shell');
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(shell.classList.contains('expanded'))shell.classList.remove('expanded');
      else if(shell.requestFullscreen)await shell.requestFullscreen().catch(()=>shell.classList.add('expanded'));
      else shell.classList.add('expanded');
      sync();setTimeout(()=>map.invalidateSize(),200);
    });
    document.addEventListener('fullscreenchange',()=>{sync();setTimeout(()=>map.invalidateSize(),200);});
    sync();return button;
  }
});

export default function VillageMap({points,center,zoom=14,focusId,label='Peta interaktif desa',className=''}){
  const node=useRef(),map=useRef(),layer=useRef(),markers=useRef(new Map());
  useEffect(()=>{
    const m=L.map(node.current,{center,zoom,scrollWheelZoom:false,tap:true,zoomControl:false});
    L.control.zoom({zoomInTitle:'Perbesar peta',zoomOutTitle:'Perkecil peta'}).addTo(m);
    m.on('popupopen',e=>{const b=e.popup.getElement()?.querySelector('.leaflet-popup-close-button');if(b){b.setAttribute('aria-label','Tutup keterangan lokasi');b.title='Tutup';}});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">kontributor OpenStreetMap</a>'}).addTo(m);
    new FullscreenControl().addTo(m);
    // Wheel zoom only after the user clicks the map, so scrolling the page is not hijacked.
    m.on('click',()=>m.scrollWheelZoom.enable());m.on('mouseout',()=>m.scrollWheelZoom.disable());
    layer.current=L.layerGroup().addTo(m);map.current=m;
    return()=>{m.remove();map.current=null;};
  },[]);
  useEffect(()=>{
    const group=layer.current;if(!group)return;group.clearLayers();markers.current.clear();
    for(const p of points){
      if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))continue;
      const marker=L.marker([p.lat,p.lng],{icon:icon(p.category),title:p.name+' — '+(categoryInfo[p.category]||categoryInfo.lainnya).label,alt:p.name,keyboard:true,riseOnHover:true}).bindPopup(()=>popupContent(p),{maxWidth:260,minWidth:200,autoPanPadding:[56,56]});
      marker.addTo(group);markers.current.set(p.id,marker);
    }
  },[points]);
  useEffect(()=>{
    const marker=focusId&&markers.current.get(focusId);
    if(marker&&map.current){map.current.setView(marker.getLatLng(),16);marker.openPopup();}
  },[focusId,points]);
  return <div className={'map-shell '+className}><div ref={node} className="village-map" role="region" aria-label={label}/></div>;
}

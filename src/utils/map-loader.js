// One Google script, bounded loading and a shared auth-failure signal for every map instance.
export const MAP_AUTH_EVENT='mm:map-auth-failure';
let promise,authFailed=false,sequence=0;
export const googleAuthFailed=()=>authFailed;
export function loadGoogleMaps(key,win=window,doc=document){
  if(authFailed)return Promise.reject(new Error('Google Maps tidak tersedia.'));
  if(!key)return Promise.reject(new Error('Google Maps belum diatur.'));
  if(win.google?.maps?.marker?.AdvancedMarkerElement)return Promise.resolve(win.google.maps);
  if(promise)return promise;
  promise=new Promise((resolve,reject)=>{
    let settled=false;const script=doc.createElement('script'),callback='__mmMapsReady'+(++sequence);
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);win[callback]=()=>{};if(error){script.remove();promise=null;reject(error);}else resolve(win.google.maps);};
    const previous=win.gm_authFailure;
    win.gm_authFailure=()=>{authFailed=true;win.dispatchEvent(new Event(MAP_AUTH_EVENT));finish(new Error('Google Maps menolak konfigurasi.'));if(typeof previous==='function')previous();};
    const timer=setTimeout(()=>finish(new Error('Google Maps terlalu lama dimuat.')),10000);
    win[callback]=()=>finish(win.google?.maps?.marker?.AdvancedMarkerElement?null:new Error('Peta gagal dimuat.'));
    script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=marker&v=weekly&language=id&region=ID&loading=async&callback='+callback;
    script.async=true;
    script.onload=()=>{if(win.google?.maps?.marker?.AdvancedMarkerElement)finish();};
    script.onerror=()=>finish(new Error('Peta gagal dimuat.'));
    doc.head.appendChild(script);
  });
  return promise;
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
const fresh=()=>import('../../src/utils/map-loader.js?test='+Math.random());
function environment(){
 const events=[],scripts=[];
 const win={dispatchEvent:e=>events.push(e.type)};
 const doc={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}};
 return {win,doc,events,scripts};
}
test('Google loader handles missing keys, deduplicates requests, and resolves marker library',async()=>{
 const m=await fresh(),e=environment();await assert.rejects(m.loadGoogleMaps('',e.win,e.doc));assert.equal(e.scripts.length,0);
 const p=m.loadGoogleMaps('test-key',e.win,e.doc),q=m.loadGoogleMaps('test-key',e.win,e.doc);assert.equal(p,q);assert.equal(e.scripts.length,1);
 e.win.google={maps:{marker:{AdvancedMarkerElement:class{}}}};e.scripts[0].onload();assert.equal(await p,e.win.google.maps);assert.equal(await q,e.win.google.maps);
});
test('Google script network failures allow another attempt',async()=>{
 const m=await fresh(),e=environment();const p=m.loadGoogleMaps('test-key',e.win,e.doc);e.scripts[0].onerror();await assert.rejects(p);assert.ok(e.scripts[0].removed);
 const q=m.loadGoogleMaps('test-key',e.win,e.doc);assert.equal(e.scripts.length,2);e.scripts[1].onerror();await assert.rejects(q);
});
test('Google auth rejection notifies every map even after script load',async()=>{
 const m=await fresh(),e=environment();const p=m.loadGoogleMaps('test-key',e.win,e.doc);e.win.google={maps:{marker:{AdvancedMarkerElement:class{}}}};e.scripts[0].onload();await p;e.win.gm_authFailure();assert.ok(m.googleAuthFailed());assert.ok(e.events.includes(m.MAP_AUTH_EVENT));await assert.rejects(m.loadGoogleMaps('test-key',e.win,e.doc));
});
test('Google never loading is bounded by timeout',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const m=await fresh(),e=environment();const p=m.loadGoogleMaps('test-key',e.win,e.doc);const rejection=assert.rejects(p,/terlalu lama/);t.mock.timers.tick(10001);await rejection;assert.ok(e.scripts[0].removed);
});

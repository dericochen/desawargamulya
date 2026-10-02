import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=rel=>readFileSync(fileURLToPath(new URL('../../'+rel,import.meta.url)),'utf8');

// Peta Desa was merged into Wisata (map shown at the top of /wisata). These guards keep the merge in place:
// internal links point to /wisata (not the old /peta-desa page), while the legacy redirect and SPA rewrite stay.
test('No internal links point to the removed /peta-desa page',()=>{
  for(const f of ['src/components/home-widgets.jsx','src/pages/pages.jsx','src/pages/portal-pages.jsx','src/admin/admin.jsx']){
    const s=read(f);
    // Only the admin page-intro filter may mention the legacy key, and never as an href.
    assert.ok(!/['"`]\/peta-desa/.test(s),`${f} still links to /peta-desa`);
  }
});

test('The route map no longer renders a separate Peta Desa page',()=>{
  const s=read('src/pages/pages.jsx');
  assert.ok(!s.includes("'/peta-desa'"),'pages route map still has /peta-desa');
  assert.ok(!s.includes('MapPage'),'pages.jsx still imports MapPage');
  assert.ok(s.includes("'/wisata'"),'pages route map lost /wisata');
});

test('The menu drops the Peta Desa item but keeps Wisata',()=>{
  const s=read('src/main.jsx');
  assert.ok(!/\{href:'\/peta-desa'/.test(s),'menu still has a Peta Desa item');
  assert.ok(/\{href:'\/wisata'/.test(s),'menu lost the Wisata item');
});

test('Legacy links keep working: /peta-desa redirects to /wisata',()=>{
  const s=read('src/main.jsx');
  assert.ok(s.includes("'/peta-desa':'/wisata'"),'missing legacy redirect for /peta-desa');
});

test('The SPA rewrite for /peta-desa is kept so direct visits can redirect',()=>{
  const s=read('vercel.json');
  assert.ok(s.includes('"source":"/peta-desa"'),'vercel.json lost the /peta-desa rewrite');
});

test('Wisata-side map links carry the lokasi focus',()=>{
  const s=read('src/pages/portal-pages.jsx');
  assert.ok(s.includes("href={'/wisata?lokasi='+t.id}"),'tourism map links should focus /wisata?lokasi=');
  assert.ok(s.includes('id="peta"'),'MapSection must expose id="peta" for /wisata#peta');
});

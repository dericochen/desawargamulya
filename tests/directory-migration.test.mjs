import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const testRoot=fileURLToPath(new URL('../.test-data/',import.meta.url));
fs.mkdirSync(testRoot,{recursive:true});
const dir=fs.mkdtempSync(path.join(testRoot,'directory-migration-'));
process.env.DATA_DIR=dir;process.env.ADMIN_EMAIL='migration@example.invalid';process.env.ADMIN_PASSWORD='Temporary-test-password-8231';
delete process.env.DATABASE_URL;delete process.env.VERCEL;
test('Directory migration preserves edits and deletions across restarts and schema upgrades',async()=>{
 const {init,query,close}=await import('../server/db.mjs');
 try{
  await init();assert.equal((await query('SELECT id FROM tourism_stays')).length,2);
  await query("UPDATE tourism_stays SET name='Judul dari admin',price=400000 WHERE id='contoh-rumah-pesisir'");
  await query("DELETE FROM tourism_stays WHERE id='contoh-kamar-warga'");
  await query("UPDATE records SET data=? WHERE id='__portal_schema'",[JSON.stringify({version:'portal-v3'})]);
  close();await init();
  const rows=await query('SELECT name,price FROM tourism_stays');assert.equal(rows.length,1);assert.equal(rows[0].name,'Judul dari admin');assert.equal(rows[0].price,400000);
  assert.equal((await query('SELECT id FROM tourism_guides')).length,2);
 }finally{
  close();const resolved=path.resolve(dir);if(!resolved.startsWith(path.resolve(testRoot)+path.sep))throw new Error('Unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:true});
 }
});

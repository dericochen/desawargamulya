import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {seedRecords,siteSeed} from './seed.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let queryFn; let transactionFn; let ready;
export async function query(text,args=[]){await init();return queryFn(text,args);}
export async function transaction(statements){await init();return transactionFn(statements);}
export const hash=t=>createHash('sha256').update(t).digest('hex');
export function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
export function verifyPassword(p,stored){try{const [s,h]=stored.split(':');const b=Buffer.from(h,'hex');const test=scryptSync(p,s,64);return b.length===test.length&&timingSafeEqual(b,test);}catch{return false;}}
export async function init(){
  if(ready)return ready;
  ready=(async()=>{
    if(process.env.DATABASE_URL){
      const {neon}=await import('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);
      queryFn=(q,args=[])=>{let n=0;return sql.query(q.replace(/\?/g,()=>'$'+(++n)),args);};
      transactionFn=statements=>sql.transaction(statements.map(s=>queryFn(s.sql,s.args)),{isolationLevel:'ReadCommitted'});
    }else{
      if(process.env.VERCEL)throw new Error('DATABASE_URL belum diatur. Database permanen diperlukan untuk deployment.');
      const {DatabaseSync}=await import('node:sqlite');
      const dir=process.env.DATA_DIR||path.join(root,'data');fs.mkdirSync(dir,{recursive:true});
      const db=new DatabaseSync(path.join(dir,'village.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
      const run=(q,args=[])=>{const st=db.prepare(q);return /^\s*(SELECT|WITH)/i.test(q)||/\bRETURNING\b/i.test(q)?st.all(...args):st.run(...args);};
      queryFn=async(q,args=[])=>run(q,args);
      transactionFn=async statements=>{db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>run(s.sql,s.args));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}};
    }
    await queryFn('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, record_id TEXT NOT NULL, mime TEXT NOT NULL, content TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS event_enrollment (event_id TEXT PRIMARY KEY, participant_capacity INTEGER NOT NULL, stall_capacity INTEGER NOT NULL, accepting INTEGER NOT NULL, active INTEGER NOT NULL, closes_at TEXT NOT NULL, ends_at TEXT NOT NULL, version TEXT NOT NULL)');
    await queryFn('CREATE TABLE IF NOT EXISTS event_registrations (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, mode TEXT NOT NULL, applicant_key TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, data TEXT NOT NULL, note TEXT NOT NULL, product_id TEXT NOT NULL, attended INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(event_id,mode,applicant_key))');
    await queryFn('CREATE INDEX IF NOT EXISTS registrations_event_status ON event_registrations(event_id,mode,status)');
    const existing=await queryFn("SELECT id FROM records WHERE id='__seeded'");
    if(!existing.length){for(const r of seedRecords())await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',[r.id,r.kind,r.status,JSON.stringify(r.data),new Date().toISOString()]);await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['__seeded','system','private','{}',new Date().toISOString()]);}
    const siteRows=await queryFn("SELECT data FROM records WHERE id='site'");
    if(siteRows.length){const site=JSON.parse(siteRows[0].data);let changed=false;for(const k of ['credits','pages'])if(!site[k]){site[k]=siteSeed[k];changed=true;}if(changed)await queryFn("UPDATE records SET data=? WHERE id='site'",[JSON.stringify(site)]);}
    const auth=await queryFn("SELECT data FROM records WHERE id='__auth'");
    if(!auth.length){
      if(process.env.VERCEL&&!process.env.ADMIN_PASSWORD)throw new Error('ADMIN_PASSWORD wajib diatur.');
      const password=process.env.ADMIN_PASSWORD||randomBytes(18).toString('base64url');
      const email=process.env.ADMIN_EMAIL||'admin@margamulya.local';
      if(password.length<12)throw new Error('ADMIN_PASSWORD minimal 12 karakter.');
      await queryFn('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING',['__auth','system','private',JSON.stringify({email,password:hashPassword(password)}),new Date().toISOString()]);
      if(!process.env.VERCEL&&!process.env.ADMIN_PASSWORD)fs.writeFileSync(path.join(root,'AKSES-ADMIN-LOKAL.txt'),'Akses admin lokal — jangan publikasikan file ini.\nHalaman: http://localhost:4173/admin\nEmail: '+email+'\nKata sandi: '+password+'\n\nDatabase lokal tersimpan dalam folder data/. Ganti kata sandi melalui menu Akun admin.\n');
    }
  })().catch(e=>{ready=null;throw e;});
  return ready;
}
export const parseRow=r=>({id:r.id,kind:r.kind,status:r.status,...JSON.parse(r.data),updatedAt:r.updated_at});
export async function getRecord(id){const rows=await query('SELECT * FROM records WHERE id=?',[id]);return rows.length?parseRow(rows[0]):null;}
export async function putRecord(id,kind,status,data){await query('INSERT INTO records (id,kind,status,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,status=excluded.status,data=excluded.data,updated_at=excluded.updated_at',[id,kind,status,JSON.stringify(data),new Date().toISOString()]);return getRecord(id);}

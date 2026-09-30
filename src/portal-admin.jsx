// Admin UI for Portal Desa: schema-driven CRUD for every portal table (with child records),
// complaint handling, citizen message inbox and the dashboard summary.
import React,{useEffect,useMemo,useState} from 'react';
import {Plus,Pencil,Trash2,ArrowUp,ArrowDown,Search,RefreshCw,Save,Send,Eye,EyeOff,Upload,MessageSquare,Megaphone,CheckCircle,ChevronLeft} from 'lucide-react';
import {api,Field,ImageField,Modal,Notice,Empty,Busy,Picture,dateLabel,timeLabel,money,numberLabel,MultiImageField,imagesOf} from './lib.jsx';
import {tables,complaintStatuses,chatCategories,facilityCategories,MAX_IMAGES} from '../server/portal-schema.mjs';
import {complaintLabel,complaintClass} from './services.jsx';

const opts=f=>f.options.map(o=>Array.isArray(o)?o:[o,o]);
const defaults=(table,extra={})=>{const out={};for(const [k,f] of Object.entries(tables[table].fields)){if(f.type==='slug')continue;out[k]=f.def??(f.type==='bool'?1:f.type==='enum'?opts(f)[0][0]:f.type==='int'||f.type==='bigint'?0:f.type==='ref'?null:'');}return {...out,...extra};};
const categoryLabel=Object.fromEntries(facilityCategories.map(([k,l,e])=>[k,e+' '+l]));

function useRefs(table){
  const refTables=[...new Set(Object.values(tables[table].fields).filter(f=>f.type==='ref').map(f=>f.table))];
  const [refs,setRefs]=useState({});
  useEffect(()=>{Promise.all(refTables.map(t=>api('/admin/portal/'+t).then(r=>[t,r]))).then(e=>setRefs(Object.fromEntries(e))).catch(()=>{});},[table]);
  return refs;
}
const refName=r=>r.name||r.title||r.question||(r.rt?`RT ${r.rt} / RW ${r.rw}`:r.id);

export function RowForm({table,row,parent,onSaved,onCancel}){
  const d=tables[table],refs=useRefs(table);
  const [f,setF]=useState(row||defaults(table,parent?{[d.parent.key]:parent.id}:{})),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const ch=(k,v)=>setF(o=>({...o,[k]:v}));
  return <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const saved=await api('/admin/portal/'+table+(row?'/'+row.id:''),{method:row?'PUT':'POST',body:f});await onSaved(saved);}catch(x){setError(x.message);}finally{setBusy(false);}}}>
    <div className="form-grid">{Object.entries(d.fields).map(([k,fd])=>{
      if(fd.type==='slug'||(d.parent&&k===d.parent.key)||(fd.showIf&&!fd.showIf(f)))return null;
      const common={key:k,label:fd.label+(fd.required?'':''),help:fd.help};
      const wide=fd.long||fd.type==='image'?'form-wide':'';
      switch(fd.type){
        case 'bool':return <label key={k} className="check-field form-wide"><input type="checkbox" checked={!!f[k]} onChange={e=>ch(k,e.target.checked?1:0)}/><span>{fd.label}{fd.help&&<small className="muted"> — {fd.help}</small>}</span></label>;
        case 'enum':return <Field {...common}><select value={f[k]} onChange={e=>ch(k,e.target.value)}>{opts(fd).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>;
        case 'ref':{const list=(refs[fd.table]||[]).filter(r=>!(fd.table===table&&r.id===row?.id));return <Field {...common}><select required={fd.required} value={f[k]||''} onChange={e=>ch(k,e.target.value||null)}><option value="">{fd.required?'Pilih…':'Tidak ada'}</option>{list.map(r=><option key={r.id} value={r.id}>{refName(r)}</option>)}</select></Field>;}
        case 'image':return <div key={k} className={wide}><MultiImageField label={fd.label+' (maksimal '+MAX_IMAGES+')'} required={fd.required} max={MAX_IMAGES} values={[f[k],...(f[k+'_more']||[])]} onChange={v=>{ch(k,v[0]||'');ch(k+'_more',v.slice(1));}}/></div>;
        case 'int':case 'bigint':case 'num':return <Field {...common} type="number" step={fd.step||1} min={fd.min} max={fd.max} required={fd.required} value={f[k]??''} onChange={e=>ch(k,e.target.value)}/>;
        case 'date':return <Field {...common} type="date" required={fd.required} value={f[k]||''} onChange={e=>ch(k,e.target.value)}/>;
        default:return fd.long?<div key={k} className="form-wide"><Field label={fd.label} help={fd.help}><textarea required={fd.required} maxLength={fd.max} value={f[k]||''} onChange={e=>ch(k,e.target.value)}/></Field></div>
          :<Field {...common} type={fd.type==='phone'?'tel':'text'} required={fd.required} maxLength={fd.max} value={f[k]||''} onChange={e=>ch(k,e.target.value)}/>;
      }
    })}</div>
    {(d.fields.latitude)&&<p className="small muted">Tip: di Google Maps, klik kanan titik lokasi lalu salin angka koordinat (contoh -6.028257, 106.524324).</p>}
    <Notice error>{error}</Notice><div className="form-actions"><button className="button" disabled={busy}><Save/>{busy?'Menyimpan…':'Simpan'}</button><button type="button" className="button secondary" onClick={onCancel}>Batal</button></div>
  </form>;
}

function rowSummary(table,r,refs={}){
  switch(table){
    case 'tourism_places':return [r.name,r.address,r.cover_image,r.is_active];
    case 'public_facilities':return [r.name,categoryLabel[r.category]+' · '+r.address,r.image_url,r.is_active];
    case 'faqs':return [r.question,r.category,null,r.is_active];
    case 'chatbot_nodes':return [r.title,({start:'Menu utama',menu:'Menu pilihan',answer:'Jawaban',handover:'Tawarkan admin'})[r.action_type]+' · '+r.message.slice(0,70),null,r.is_active];
    case 'chatbot_options':return [r.option_number+'. '+r.label,({goto:'→ '+(refs.chatbot_nodes?.find(n=>n.id===r.target_node_id)?.title||'menu'),handover:'→ admin',complaint:'→ pengaduan '+r.action_value,track:'→ cek pengaduan',faq:'→ FAQ',link:'→ '+r.action_value,emergency:'→ darurat',root:'→ menu utama'})[r.action],null,1];
    case 'emergency_contacts':return [r.name,(r.phone||'Nomor belum diisi')+' · '+(r.scope==='nasional'?'Nasional':'Lokal'),null,r.is_active];
    case 'village_areas':return [r.name,'Urutan '+r.sort_order,null,r.is_active];
    case 'neighborhood_units':return ['RT '+r.rt+' / RW '+r.rw,'',null,r.is_active];
    case 'development_projects':return [r.title,r.status+' · '+r.progress+'% · '+r.year+(r.budget?' · '+money(r.budget):''),r.cover_image,r.is_published];
    case 'project_updates':return [r.title,dateLabel(r.date)+(r.phase?' · foto '+r.phase:'')+(r.progress?' · '+r.progress+'%':''),r.image_url,1];
    case 'aid_programs':return [r.name,r.status+' · '+r.year+(r.show_recipients?' · daftar penerima publik':''),r.cover_image,r.is_published];
    case 'aid_recipients':return [r.name,(refs.village_areas?.find(a=>a.id===r.village_area_id)?.name||'—')+' · '+r.status,null,r.is_active];
    case 'aid_documentation':return [r.caption||'Foto dokumentasi',[r.stage,dateLabel(r.date)].filter(Boolean).join(' · '),r.image_url,1];
    case 'tourism_gallery':return [r.caption||'Foto',null,r.image_url,1];
    default:return [r.name||r.title||r.id,'',null,1];
  }
}

// Generic list: search, active toggle, reorder, edit, delete, and nested child lists.
export function TableManager({table,parent,title,compact=false,onChanged}){
  const d=tables[table],refs=useRefs(table);
  const [rows,setRows]=useState(null),[editing,setEditing]=useState(null),[children,setChildren]=useState(null),[q,setQ]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const load=async()=>{try{setRows(await api('/admin/portal/'+table+(parent?`?${d.parent.key}=${parent.id}`:'')));setError('');}catch(x){setError(x.message);}};
  useEffect(()=>{load();},[table,parent?.id]);
  const flag=d.publicFlag;const done=async msg=>{setEditing(null);await load();setMessage(msg);onChanged?.();};
  const list=(rows||[]).filter(r=>JSON.stringify(rowSummary(table,r,refs)).toLowerCase().includes(q.toLowerCase()));
  const act=async(fn,msg)=>{try{setError('');await fn();await done(msg);}catch(x){setError(x.message);}};
  return <div className={'table-manager '+(compact?'compact':'')}>
    <div className="filter-bar">{!compact&&<div className="search-field"><Search/><input aria-label={'Cari '+d.item} placeholder={'Cari '+d.item+'…'} value={q} onChange={e=>setQ(e.target.value)}/></div>}<button className="button" onClick={()=>{setMessage('');setEditing('new');}}><Plus/>Tambah {d.item}</button>{!compact&&<span className="result-count">{list.length} data</span>}</div>
    <Notice>{message}</Notice><Notice error>{error}</Notice>
    {rows===null?!error&&<Busy/>:list.length?<div className="records-list">{list.map((r,i)=>{const [name,sub,img,active]=rowSummary(table,r,refs);return <div className="record-row" key={r.id}>
      {img!==null&&(img?<Picture src={img} alt="" className="record-thumbnail"/>:<div className="record-thumbnail calendar-thumb" aria-hidden="true">—</div>)}
      <div className="record-title"><strong>{name}</strong>{sub&&<p>{sub}</p>}</div>
      {flag&&<span className={'status '+(active?'published':'draft')}>{active?(flag==='is_published'?'Terbit':'Aktif'):(flag==='is_published'?'Draf':'Nonaktif')}</span>}
      <div className="row-actions">
        {d.order.startsWith('sort_order')&&!q&&<><button className="icon-button" aria-label={'Naikkan urutan '+name} disabled={i===0} onClick={()=>act(()=>api(`/admin/portal/${table}/${r.id}/move`,{method:'POST',body:{direction:-1}}),'Urutan diperbarui.')}><ArrowUp/></button><button className="icon-button" aria-label={'Turunkan urutan '+name} disabled={i===list.length-1} onClick={()=>act(()=>api(`/admin/portal/${table}/${r.id}/move`,{method:'POST',body:{direction:1}}),'Urutan diperbarui.')}><ArrowDown/></button></>}
        {flag&&<button className="icon-button" aria-label={(active?'Nonaktifkan ':'Aktifkan ')+name} title={active?'Sembunyikan dari publik':'Tampilkan ke publik'} onClick={()=>act(()=>api(`/admin/portal/${table}/${r.id}`,{method:'PUT',body:{[flag]:active?0:1}}),active?'Disembunyikan dari publik.':'Ditampilkan ke publik.')}>{active?<EyeOff/>:<Eye/>}</button>}
        <button className="icon-button" aria-label={'Edit '+name} onClick={()=>{setMessage('');setEditing(r);}}><Pencil/></button>
        <button className="icon-button danger-text" aria-label={'Hapus '+name} onClick={()=>{if(confirm(`Hapus “${name}”?${d.children?' Data turunan (foto/pilihan/RT) ikut terhapus.':''} Tindakan ini tidak dapat dibatalkan.`))act(()=>api(`/admin/portal/${table}/${r.id}`,{method:'DELETE'}),'Data dihapus.');}}><Trash2/></button>
      </div>
      {(d.children||table==='aid_programs')&&<div className="row-children">{(d.children||[]).map(c=><button key={c.table} className="plain-link" onClick={()=>setChildren({...c,row:r,name})}>{c.title}</button>)}{table==='aid_programs'&&<button className="plain-link" onClick={()=>setChildren({table:'aid_recipients',key:'program_id',title:'Penerima',row:r,name})}>Penerima</button>}</div>}
    </div>;})}</div>:<Empty title="Belum ada data" text={'Tambahkan '+d.item+' pertama.'}/>}
    {editing&&<Modal title={(editing==='new'?'Tambah ':'Edit ')+d.item} wide onClose={()=>setEditing(null)}><RowForm table={table} row={editing==='new'?null:editing} parent={parent} onCancel={()=>setEditing(null)} onSaved={()=>done('Perubahan tersimpan dan langsung tampil di website.')}/></Modal>}
    {children&&<Modal title={children.title+' — '+children.name} wide onClose={()=>{setChildren(null);load();}}>
      {children.table==='aid_recipients'&&<RecipientImport program={children.row}/>}
      {children.table==='aid_recipients'&&<div className="privacy-note"><p>Isi nama dan dusun saja. Jangan memasukkan NIK, nomor KK, nomor HP, atau alamat rumah. Di website publik nama tampil tersamar, misalnya D*** S******.</p></div>}
      <TableManager table={children.table} parent={children.row} compact onChanged={onChanged}/></Modal>}
  </div>;
}
function RecipientImport({program}){
  const [open,setOpen]=useState(false),[rows,setRows]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState('');
  if(!open)return <button className="button secondary import-toggle" onClick={()=>setOpen(true)}><Upload/>Impor banyak penerima</button>;
  return <form className="panel import-panel" onSubmit={async e=>{e.preventDefault();setErr('');try{const r=await api('/admin/portal/aid_recipients/import',{method:'POST',body:{program_id:program.id,rows}});setMsg(r.imported+' penerima ditambahkan. Tutup lalu buka kembali daftar untuk melihatnya.');setRows('');}catch(x){setErr(x.message);}}}>
    <Field label="Satu penerima per baris: Nama;Dusun;Status" help="Contoh: Siti Aminah;Dusun I;Sudah disalurkan — Status opsional. Bisa ditempel dari Excel (kolom dipisah tab)."><textarea required value={rows} onChange={e=>setRows(e.target.value)}/></Field>
    <Notice error>{err}</Notice><Notice>{msg}</Notice><div className="form-actions"><button className="button"><Upload/>Impor</button><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Tutup</button></div></form>;
}

export function ComplaintsAdmin({onChanged}){
  const [rows,setRows]=useState(null),[status,setStatus]=useState('all'),[q,setQ]=useState(''),[open,setOpen]=useState(null),[error,setError]=useState('');
  const load=()=>api('/admin/complaints').then(r=>{setRows(r);setError('');}).catch(x=>setError(x.message));
  useEffect(()=>{load();},[]);
  const list=(rows||[]).filter(c=>(status==='all'||c.status===status)&&[c.ticket,c.name,c.title,c.category,c.area_name,c.location].join(' ').toLowerCase().includes(q.toLowerCase()));
  return <><div className="registration-summary">{complaintStatuses.slice(0,4).map(([k,l])=><button key={k} className={status===k?'active':''} onClick={()=>setStatus(status===k?'all':k)}><span>{l}</span><strong>{(rows||[]).filter(c=>c.status===k).length}</strong></button>)}</div>
    <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Cari pengaduan" placeholder="Cari tiket, nama, judul, atau lokasi…" value={q} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Status pengaduan" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Semua status</option>{complaintStatuses.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select><button className="button secondary" onClick={load}><RefreshCw size={16}/>Muat ulang</button></div>
    <Notice error>{error}</Notice>
    {rows===null?!error&&<Busy/>:list.length?<div className="records-list">{list.map(c=><div className="registration-row" key={c.id}><div className="registration-symbol ticket-symbol">{c.ticket}</div><div className="registration-person"><strong>{c.title}</strong><p>{c.category} · {c.area_name||'Wilayah tidak diisi'}{c.rt&&` · RT ${c.rt}/RW ${c.rw}`}</p><p>{c.name} · {timeLabel(c.created_at)}</p></div><span className={'status '+complaintClass[c.status]}>{complaintLabel[c.status]}</span><button className="button secondary" onClick={()=>setOpen(c.id)}>Tindak lanjut</button></div>)}</div>:<Empty title="Belum ada pengaduan yang sesuai"/>}
    {open&&<ComplaintDetail id={open} onClose={()=>setOpen(null)} onSaved={async()=>{await load();onChanged?.();}}/>}</>;
}
function ComplaintDetail({id,onClose,onSaved}){
  const [c,setC]=useState(null),[status,setStatus]=useState(''),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
  const load=()=>api('/admin/complaints/'+id).then(r=>{setC(r);setStatus(r.status);}).catch(x=>setError(x.message));
  useEffect(()=>{load();},[id]);
  const wa=c&&'https://wa.me/'+c.phone+'?text='+encodeURIComponent(`Halo ${c.name}, kami dari Pemerintah Desa Marga Mulya terkait pengaduan ${c.ticket}.`);
  return <Modal title={c?c.ticket+' · '+c.title:'Pengaduan'} wide onClose={onClose}>{!c?<><Busy/><Notice error>{error}</Notice></>:<>
    <span className={'status '+complaintClass[c.status]}>{complaintLabel[c.status]}</span>
    <dl className="applicant-details">{[['Nama',c.name],['WhatsApp',c.phone],['Dusun / wilayah',c.area_name||'—'],['RT / RW',c.rt?`${c.rt} / ${c.rw||'—'}`:'—'],['Kategori',c.category],['Lokasi kejadian',c.location],['Isi pengaduan',c.body],['Dikirim',timeLabel(c.created_at)]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    {imagesOf(c).length>0&&<div className="complaint-photos">{imagesOf(c).map((src,i)=><a key={i} href={src} target="_blank" rel="noreferrer" aria-label={`Buka foto ${i+1} pengaduan ${c.ticket}`}><Picture src={src} alt={`Foto ${i+1} pengaduan ${c.ticket}`}/></a>)}</div>}
    <a className="button secondary" href={wa} target="_blank" rel="noreferrer"><MessageSquare/>Hubungi pelapor via WhatsApp</a>
    <h3 className="detail-heading">Riwayat</h3><ul className="update-list">{c.updates.map(u=><li key={u.id}><time>{timeLabel(u.created_at)}</time><span className={'status '+complaintClass[u.status]}>{complaintLabel[u.status]}</span>{u.note&&<p>{u.note}</p>}</li>)}</ul>
    <form className="publish-box" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setMsg('');try{await api('/admin/complaints/'+c.id,{method:'PUT',body:{status,note,updated_at:c.updated_at}});setNote('');await load();await onSaved();setMsg('Status tersimpan. Warga dapat melihatnya melalui Cek Pengaduan.');}catch(x){setError(x.message);}finally{setBusy(false);}}}>
      <Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value)}>{complaintStatuses.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Catatan untuk warga" help="Tampil pada halaman Cek Pengaduan. Contoh: Petugas telah melakukan pengecekan lokasi."><textarea required={status==='ditolak'} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></Field>
      <Notice error>{error}</Notice><Notice>{msg}</Notice><div className="form-actions"><button className="button" disabled={busy}><Save/>{busy?'Menyimpan…':'Simpan tindak lanjut'}</button><button type="button" className="button danger" onClick={async()=>{if(!confirm('Hapus pengaduan '+c.ticket+' beserta fotonya? Nomor tiket tidak akan dipakai ulang.'))return;try{await api('/admin/complaints/'+c.id,{method:'DELETE'});await onSaved();onClose();}catch(x){setError(x.message);}}}><Trash2/>Hapus</button></div>
    </form></>}</Modal>;
}

export function Inbox({onChanged}){
  const [list,setList]=useState(null),[active,setActive]=useState(null),[thread,setThread]=useState(null),[text,setText]=useState(''),[filter,setFilter]=useState('open'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const loadList=()=>api('/admin/chats').then(r=>{setList(r);setError('');}).catch(x=>setError(x.message));
  const loadThread=id=>api('/admin/chats/'+id).then(setThread).catch(x=>setError(x.message));
  useEffect(()=>{loadList();const t=setInterval(()=>{if(document.visibilityState==='visible'){loadList();if(active)loadThread(active);}},6000);return()=>clearInterval(t);},[active]);
  useEffect(()=>{if(active){loadThread(active).then(()=>{loadList();onChanged?.();});}else setThread(null);},[active]);
  const shown=(list||[]).filter(c=>filter==='all'||c.status===filter||(filter==='unread'&&c.unread));
  const update=async body=>{await api('/admin/chats/'+active,{method:'PUT',body});await loadThread(active);await loadList();};
  return <div className={'inbox '+(active?'has-active':'')}>
    <aside className="inbox-list"><div className="inbox-filters" role="group" aria-label="Filter percakapan">{[['open','Aktif'],['unread','Belum dibaca'],['closed','Selesai'],['all','Semua']].map(([k,l])=><button key={k} className={filter===k?'active':''} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div>
      <Notice error>{error}</Notice>
      {list===null?<Busy/>:shown.length?<ul>{shown.map(c=><li key={c.id}><button className={(active===c.id?'active ':'')+(c.unread?'unread':'')} onClick={()=>setActive(c.id)}><span className="inbox-name">{c.name}{c.unread>0&&<b aria-label={c.unread+' pesan baru'}>● {c.unread} baru</b>}</span><span className="inbox-topic">{c.category}</span><span className="inbox-preview">{c.last_sender==='admin'?'Anda: ':''}{c.last_body}</span><time>{timeLabel(c.last_message_at)}</time></button></li>)}</ul>:<Empty title="Belum ada pesan" text="Pesan warga dari Asisten Desa akan muncul di sini."/>}
    </aside>
    <section className="inbox-thread">{!thread?<div className="inbox-empty"><MessageSquare aria-hidden="true"/><p>Pilih percakapan di sebelah kiri.</p></div>:<>
      <header className="thread-head"><button className="icon-button inbox-back" aria-label="Kembali ke daftar" onClick={()=>setActive(null)}><ChevronLeft/></button><div><strong>{thread.name}</strong><p>{thread.phone?<a href={'https://wa.me/'+thread.phone} target="_blank" rel="noreferrer">WA {thread.phone}</a>:'Tanpa nomor'} · mulai {timeLabel(thread.created_at)}</p></div>
        <select aria-label="Kategori percakapan" value={thread.category} onChange={e=>update({category:e.target.value})}>{chatCategories.map(c=><option key={c}>{c}</option>)}</select>
        {thread.status==='open'?<button className="button secondary" onClick={()=>update({status:'closed'})}><CheckCircle/>Tandai selesai</button>:<button className="button secondary" onClick={()=>update({status:'open'})}><RefreshCw/>Buka kembali</button>}</header>
      <div className="chat-log admin-log">{thread.messages.map(m=><div key={m.id} className={'bubble '+(m.sender==='admin'?'me':'them')}><span className="bubble-who">{m.sender==='admin'?'Admin Desa':thread.name}</span><p>{m.body}</p><time>{timeLabel(m.created_at)}</time></div>)}</div>
      <form className="chat-input" onSubmit={async e=>{e.preventDefault();if(!text.trim())return;setBusy(true);try{await api('/admin/chats/'+active+'/messages',{method:'POST',body:{body:text}});setText('');await loadThread(active);await loadList();}catch(x){setError(x.message);}finally{setBusy(false);}}}><label className="sr-only" htmlFor="admin-reply">Balasan</label><textarea id="admin-reply" rows={2} maxLength={2000} placeholder="Tulis balasan untuk warga…" value={text} onChange={e=>setText(e.target.value)}/><button className="button" disabled={busy||!text.trim()}><Send/>Kirim</button></form>
      <button className="plain-link danger-text small" onClick={async()=>{if(!confirm('Hapus percakapan ini secara permanen?'))return;await api('/admin/chats/'+active,{method:'DELETE'});setActive(null);loadList();}}>Hapus percakapan</button>
    </>}</section>
  </div>;
}

export function PortalDashboard({go,records}){
  const [s,setS]=useState(null),[chats,setChats]=useState([]),[error,setError]=useState('');
  useEffect(()=>{Promise.all([api('/admin/summary'),api('/admin/chats')]).then(([a,b])=>{setS(a);setChats(b.slice(0,5));}).catch(x=>setError(x.message));},[]);
  if(!s)return error?<Notice error>{error}</Notice>:<Busy/>;
  const pending=records.filter(r=>r.kind==='product'&&r.status==='pending').length;
  const cards=[['Pengaduan Baru',s.complaints.baru,'complaints','attention'],['Pengaduan Diproses',s.complaints.diverifikasi+s.complaints.diproses,'complaints'],['Pengaduan Selesai',s.complaints.selesai,'complaints'],['Pesan Belum Dibaca',s.unread,'inbox',s.unread?'attention':''],['Jumlah Wisata',s.tourism,'tourism_places'],['Proyek Pembangunan Aktif',s.projects,'development_projects'],['Program Bantuan Aktif',s.aid,'aid_programs'],['Jumlah Galeri',s.gallery,'gallery']];
  return <>{s.storage&&<p className={'small storage-note '+(s.storage.usedMB>s.storage.limitMB*.8?'danger-text':'muted')}>Penyimpanan foto: {numberLabel(s.storage.usedMB)} MB dari {numberLabel(s.storage.limitMB)} MB. {s.storage.usedMB>s.storage.limitMB*.8?'Hapus foto yang tidak dipakai agar unggahan tetap berjalan.':''}</p>}<div className="admin-stats portal-stats">{cards.map(([label,n,k,tone])=><button key={label} className={tone&&n?'attention':''} onClick={()=>go(k)}><span>{label}</span><strong>{numberLabel(n)}</strong></button>)}</div>
    {pending>0&&<Notice>{pending} pengajuan produk Lapak Desa menunggu peninjauan. <button className="plain-link" onClick={()=>go('product')}>Tinjau sekarang</button></Notice>}
    <div className="dashboard-columns"><div className="panel"><div className="section-heading"><h3><Megaphone size={18}/> Pengaduan Terbaru</h3><button className="plain-link" onClick={()=>go('complaints')}>Semua pengaduan</button></div>{s.latestComplaints.length?<ul className="dash-list">{s.latestComplaints.map(c=><li key={c.id}><button onClick={()=>go('complaints')}><strong>{c.ticket} · {c.title}</strong><span>{c.category} · {c.name} · {timeLabel(c.created_at)}</span></button><span className={'status '+complaintClass[c.status]}>{complaintLabel[c.status]}</span></li>)}</ul>:<Empty title="Belum ada pengaduan"/>}</div>
      <div className="panel"><div className="section-heading"><h3><MessageSquare size={18}/> Pesan Warga Terbaru</h3><button className="plain-link" onClick={()=>go('inbox')}>Buka Pesan Warga</button></div>{chats.length?<ul className="dash-list">{chats.map(c=><li key={c.id}><button onClick={()=>go('inbox')}><strong>{c.name} · {c.category}</strong><span>{c.last_body}</span></button>{c.unread>0?<span className="status pending">● {c.unread} baru</span>:<span className="small muted">{timeLabel(c.last_message_at)}</span>}</li>)}</ul>:<Empty title="Belum ada pesan"/>}</div></div></>;
}

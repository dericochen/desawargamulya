// Layanan warga: FAQ first, then complaint form (TIK-xxx ticket) and ticket tracking.
import React,{useEffect,useState,useRef} from 'react';
import {Megaphone,SearchCheck,MessageCircle,PhoneCall,CheckCircle,Clipboard,ChevronDown,ShieldCheck,ArrowLeft,Search} from 'lucide-react';
import {Link,Field,MultiImageField,Notice,Empty,PageIntro,api,dateLabel,param,navigate,openAssistant,openEmergency} from './lib.jsx';
import {complaintCategories,complaintStatuses} from '../server/portal-schema.mjs';

// Dates of complaint updates in the village time zone (stored timestamps are UTC).
const localDate=iso=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(iso));
export const complaintLabel=Object.fromEntries(complaintStatuses);
export const complaintClass={baru:'pending',diverifikasi:'revision',diproses:'revision',selesai:'published',ditolak:'rejected'};
// Ticket codes sent from this device are remembered so residents do not have to retype them.
const savedTickets=()=>{try{return JSON.parse(localStorage.getItem('mm_tickets')||'[]').map(x=>typeof x==='string'?x:x?.code).filter(x=>typeof x==='string'&&/^TIK-\d+-/.test(x));}catch{return [];}};
const rememberTicket=code=>{try{localStorage.setItem('mm_tickets',JSON.stringify([code,...savedTickets().filter(x=>x!==code)].slice(0,5)));}catch{}};
const forgetTickets=()=>{try{localStorage.removeItem('mm_tickets');}catch{}};
export const followUpNote='Petugas memeriksa pengaduan pada jam pelayanan desa. Lama tindak lanjut bergantung pada jenis masalah; perkembangan dan catatan petugas dapat dicek dengan kode tiket.';

function Faq({faqs}){
  const [q,setQ]=useState(''),[category,setCategory]=useState('Semua'),[open,setOpen]=useState(param('faq'));
  useEffect(()=>{if(param('faq'))document.getElementById('faq-'+param('faq'))?.scrollIntoView({block:'center'});},[]);
  const list=faqs.filter(f=>(category==='Semua'||f.category===category)&&(f.question+' '+f.answer).toLowerCase().includes(q.trim().toLowerCase()));
  return <section className="faq" aria-labelledby="faq-title"><h2 id="faq-title">Pertanyaan yang sering diajukan</h2>
    <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Cari pertanyaan" placeholder="Cari pertanyaan, misalnya: surat domisili" value={q} onChange={e=>setQ(e.target.value)}/></div></div>
    <div className="category-buttons">{['Semua',...new Set(faqs.map(f=>f.category).filter(Boolean))].map(c=><button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    {list.length?<div className="faq-list">{list.map(f=><div key={f.id} id={'faq-'+f.id} className={'faq-item '+(open===f.id?'open':'')}><h3><button aria-expanded={open===f.id} aria-controls={'faq-answer-'+f.id} onClick={()=>setOpen(open===f.id?'':f.id)}><span>{f.question}</span><ChevronDown aria-hidden="true"/></button></h3><div id={'faq-answer-'+f.id} hidden={open!==f.id} className="faq-answer"><p>{f.answer}</p></div></div>)}</div>:<Empty title="Pertanyaan belum ditemukan" text="Coba kata lain atau tanyakan kepada Asisten Desa."/>}
  </section>;
}

function ComplaintForm({areas,initialCategory,onBack}){
  const [f,setF]=useState({name:'',phone:'',village_area_id:'',unit:'',rt:'',rw:'',category:complaintCategories.includes(initialCategory)?initialCategory:'',title:'',body:'',location:'',images:[],consent:false,website:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null),[copied,setCopied]=useState(''),top=useRef();
  const ch=(k,v)=>setF(o=>({...o,[k]:v}));const area=areas.find(a=>a.id===f.village_area_id);
  useEffect(()=>{top.current?.scrollIntoView({block:'start'});},[receipt]);
  if(receipt)return <div className="receipt complaint-receipt" ref={top}><CheckCircle size={48}/><h2>Pengaduan Berhasil Dikirim</h2>
    <p>Kode Tiket Anda</p><div className="ticket-number ticket-code" aria-live="polite">{receipt.code}</div>
    <p>Simpan kode ini untuk mengecek status pengaduan Anda. Cukup salin dan tempel kode lengkapnya. Kode ini bersifat pribadi.</p>
    <p className="small muted">{followUpNote}</p>
    <div className="form-actions center"><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(receipt.code);setCopied('Kode tiket tersalin.');}catch{setCopied('Catat kode tiket di atas secara manual.');}}}><Clipboard/>Salin Kode Tiket</button><Link className="button secondary" href={'/pengaduan?tab=cek&tiket='+receipt.code}>Cek Pengaduan</Link></div><Notice>{copied}</Notice></div>;
  return <form ref={top} className="complaint-form panel" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const unit=area?.units.find(u=>u.id===f.unit);const r=await api('/complaints',{method:'POST',body:{...f,rt:unit?unit.rt:f.rt,rw:unit?unit.rw:f.rw}});rememberTicket(r.code);setReceipt(r);}catch(x){setError(x.message);}finally{setBusy(false);}}}>
    <button type="button" className="plain-link back-link" onClick={onBack}><ArrowLeft size={16}/>Kembali ke pertanyaan umum</button>
    <h2>Buat pengaduan</h2><p className="form-intro">Isi singkat saja. Data pribadi Anda hanya dibaca petugas desa dan tidak ditampilkan di website.</p>
    <div className="form-grid"><Field label="Nama" autoComplete="name" required minLength={3} maxLength={120} value={f.name} onChange={e=>ch('name',e.target.value)}/><Field label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" required placeholder="Contoh: 081234567890" value={f.phone} onChange={e=>ch('phone',e.target.value)}/></div>
    <div className="form-grid"><Field label="Dusun / Wilayah">{areas.length?<select required value={f.village_area_id} onChange={e=>setF(o=>({...o,village_area_id:e.target.value,unit:''}))}><option value="">Pilih Dusun</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>:<p className="small muted">Daftar dusun belum diatur pengelola.</p>}</Field>
      {area?.units.length?<Field label="RT / RW"><select value={f.unit} onChange={e=>ch('unit',e.target.value)}><option value="">Pilih RT / RW (opsional)</option>{area.units.map(u=><option key={u.id} value={u.id}>RT {u.rt} / RW {u.rw}</option>)}</select></Field>
      :<div className="form-grid rt-rw"><Field label="RT (opsional)" inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} placeholder="003" value={f.rt} onChange={e=>ch('rt',e.target.value)}/><Field label="RW (opsional)" inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} placeholder="002" value={f.rw} onChange={e=>ch('rw',e.target.value)}/></div>}</div>
    <Field label="Kategori Pengaduan"><select required value={f.category} onChange={e=>ch('category',e.target.value)}><option value="">Pilih kategori</option>{complaintCategories.map(c=><option key={c}>{c}</option>)}</select></Field>
    <Field label="Judul Pengaduan" required minLength={5} maxLength={150} placeholder="Contoh: Lampu jalan mati di depan masjid" value={f.title} onChange={e=>ch('title',e.target.value)}/>
    <Field label="Isi Pengaduan"><textarea required minLength={10} maxLength={3000} placeholder="Ceritakan apa yang terjadi dan sejak kapan." value={f.body} onChange={e=>ch('body',e.target.value)}/></Field>
    <Field label="Lokasi kejadian" required minLength={3} maxLength={300} placeholder="Nama jalan, patokan, atau kampung" value={f.location} onChange={e=>ch('location',e.target.value)}/>
    <MultiImageField label="Foto kejadian (opsional, maksimal 3)" values={f.images} onChange={v=>ch('images',v)} help="Foto membantu petugas memahami lokasi dan masalah. JPG, PNG, atau WebP."/>
    <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={e=>ch('website',e.target.value)}/></label></div>
    <label className="check-field consent-strong"><input type="checkbox" required checked={f.consent} onChange={e=>ch('consent',e.target.checked)}/><span>Saya menyatakan informasi yang saya berikan benar dan dapat dipertanggungjawabkan.</span></label>
    <Notice error>{error}</Notice><div className="form-actions"><button className="button" disabled={busy}>{busy?'Mengirim…':'Kirim pengaduan'}</button><button type="button" className="button secondary" onClick={onBack}>Batal</button></div>
  </form>;
}

const steps=[['baru','Pengaduan diterima','Pengaduan diterima'],['diverifikasi','Sudah diverifikasi','Sedang diverifikasi'],['diproses','Sudah diproses','Diproses'],['selesai','Selesai','Selesai']];
function Timeline({status}){
  const reached={baru:[0,1],diverifikasi:[1,2],diproses:[1,2],selesai:[3,4],ditolak:[0,-1]}[status]||[0,1];
  const shown=status==='ditolak'?steps.slice(0,1):steps;
  return <ol className="ticket-timeline">{shown.map(([k,done,current],i)=>{const state=i<=reached[0]?'done':i===reached[1]?'current':'todo';return <li key={k} className={state}><span className="step-mark" aria-hidden="true">{state==='done'?'✓':state==='current'?'●':'○'}</span><span>{state==='done'?done:current}{state==='current'&&k==='diproses'&&status==='diproses'?' (sedang berjalan)':''}</span><span className="sr-only">{state==='done'?' — selesai':state==='current'?' — tahap saat ini':' — belum'}</span></li>;})}{status==='ditolak'&&<li className="rejected"><span className="step-mark" aria-hidden="true">✕</span><span>Pengaduan ditolak</span></li>}</ol>;
}
function Feedback({code,onDone}){
  const [rating,setRating]=useState(0),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <form className="feedback-box" onSubmit={async e=>{e.preventDefault();if(!rating)return setError('Pilih penilaian terlebih dahulu.');setBusy(true);setError('');try{await api('/complaints/feedback',{method:'POST',body:{code,rating,note}});onDone();}catch(x){setError(x.message);}finally{setBusy(false);}}}>
    <h3>Bagaimana penanganan pengaduan ini?</h3><p className="small muted">Penilaian Anda membantu pemerintah desa meningkatkan pelayanan.</p>
    <div className="rating" role="radiogroup" aria-label="Penilaian penanganan">{[1,2,3,4,5].map(n=><button type="button" key={n} role="radio" aria-checked={rating===n} aria-label={n+' dari 5'} className={n<=rating?'on':''} onClick={()=>setRating(n)}>★</button>)}<span className="small muted">{['','Sangat kurang','Kurang','Cukup','Baik','Sangat baik'][rating]}</span></div>
    <Field label="Komentar (opsional)"><textarea maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></Field>
    <Notice error>{error}</Notice><button className="button" disabled={busy}>{busy?'Mengirim…':'Kirim penilaian'}</button></form>;
}
function TrackComplaint(){
  const mine=savedTickets(),start=param('tiket');
  const [code,setCode]=useState(start),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[used,setUsed]=useState('');
  const check=async(c=code)=>{const v=c.trim();if(!v)return;setBusy(true);setError('');setResult(null);try{setResult(await api('/complaints/status',{method:'POST',body:{code:v}}));setUsed(v);}catch(x){setError(x.message);}finally{setBusy(false);}};
  useEffect(()=>{if(start)check(start);},[]);
  return <section className="panel track-panel" aria-labelledby="track-title"><h2 id="track-title">Cek pengaduan</h2><p className="form-intro">Tempel kode tiket yang Anda terima setelah mengirim pengaduan.</p>
    <form className="track-form" onSubmit={e=>{e.preventDefault();check();}}><Field label="Kode Tiket" required placeholder="Contoh: TIK-023-K7Q" autoComplete="off" spellCheck={false} maxLength={30} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button className="button" disabled={busy}>{busy?'Memeriksa…':'Cek status'}</button></form>
    <p className="small muted">Kehilangan kode? Hubungi Kantor Desa atau kirim pesan melalui Tanya Desa; petugas dapat membuatkan kode baru.</p>
    {mine.length>0&&<p className="small muted saved-tickets">Tiket di perangkat ini: {mine.map(t=><button key={t} className="plain-link" onClick={()=>{setCode(t);check(t);}}>{t}</button>)}<button className="plain-link" onClick={()=>{forgetTickets();setResult(null);setCode('');}}>Hapus dari perangkat</button></p>}
    <Notice error>{error}</Notice>
    {result&&<div className="tracking-result" aria-live="polite"><div className="ticket-head"><strong className="ticket-small">{result.ticket}</strong><span className={'status '+complaintClass[result.status]}>{complaintLabel[result.status]}</span></div>
      <p className="muted small">{result.category}{result.area&&' · '+result.area} · Dikirim {localDate(result.createdAt)}</p>
      <Timeline status={result.status}/>
      <h3>Catatan petugas</h3><ul className="update-list">{result.updates.map((u,i)=><li key={i}><time>{localDate(u.created_at)}</time><span className={'status '+complaintClass[u.status]}>{complaintLabel[u.status]}</span>{u.note&&<p>“{u.note}”</p>}</li>)}</ul>
      {result.status!=='selesai'&&result.status!=='ditolak'&&<p className="small muted">{followUpNote}</p>}
      {result.feedback?<p className="feedback-done">Terima kasih. Penilaian Anda: {'★'.repeat(result.feedback.rating)}{'☆'.repeat(5-result.feedback.rating)}</p>:result.canFeedback&&used&&<Feedback code={used} onDone={()=>check(used)}/>}
      <p className="small muted">Demi privasi, nama, nomor, isi, dan foto pengaduan tidak ditampilkan di halaman ini.</p></div>}
  </section>;
}

export function HelpCenter({data}){
  const [form,setForm]=useState(param('buat')==='1');const s=data.site;const mode=param('tab')==='cek'?'cek':'faq';
  useEffect(()=>{setForm(param('buat')==='1');},[location.search]);
  useEffect(()=>{if(param('tanya')==='1')openAssistant();},[])
  const actions=[[Megaphone,'Buat Pengaduan','Laporkan masalah di lingkungan',()=>navigate('/pengaduan?buat=1')],[SearchCheck,'Cek Pengaduan','Lihat perkembangan tiket',()=>navigate('/pengaduan?tab=cek')],[MessageCircle,'Tanya Asisten Desa','Menu bantuan & chat admin',()=>openAssistant()],[PhoneCall,'Nomor Darurat','Polisi, ambulans, pemadam',openEmergency]];
  return <><PageIntro {...s.pages.pengaduan}>{s.pages.pengaduan.intro}</PageIntro>
    <div className="service-actions">{actions.map(([Icon,title,text,go])=><button key={title} className={(title==='Nomor Darurat'?'emergency-action ':'')+((title==='Cek Pengaduan'&&mode==='cek'&&!form)||(title==='Buat Pengaduan'&&form)?'current':'')} aria-current={(title==='Cek Pengaduan'&&mode==='cek'&&!form)||(title==='Buat Pengaduan'&&form)?'true':undefined} onClick={go}><Icon aria-hidden="true"/><strong>{title}</strong><span>{text}</span></button>)}</div>
    {form?<ComplaintForm areas={data.portal.areas} initialCategory={param('kategori')} onBack={()=>navigate('/pengaduan')}/>
      :mode==='cek'?<TrackComplaint/>
      :<><Faq faqs={data.portal.faqs}/>
        <section className="still-help"><div><h2>Masih membutuhkan bantuan?</h2><p>Asisten Desa memandu Anda dengan menu pilihan angka. Jika belum terjawab, Anda dapat langsung terhubung dengan Admin Desa.</p></div><div className="form-actions"><button className="button" onClick={()=>openAssistant()}><MessageCircle/>Tanya Asisten Desa</button><button className="button secondary" onClick={()=>navigate('/pengaduan?buat=1')}><Megaphone/>Buat Pengaduan</button></div></section></>}
    <div className="subtle-note"><ShieldCheck size={18}/><p>Untuk keadaan darurat jangan menunggu balasan pengaduan. Tekan “Nomor Darurat” untuk langsung menelepon.</p></div></>;
}

import React,{useEffect,useState} from 'react';
import {CheckCircle,Clipboard,ShieldCheck,Store,Users} from 'lucide-react';
import {api,Field,Modal,Notice,dateLabel} from './lib.jsx';

export const registrationLabels={pending:'Menunggu peninjauan',revision:'Perlu perbaikan',approved:'Disetujui',rejected:'Ditolak',cancelled:'Dibatalkan'};
export const registrationModes={participant:'Peserta kegiatan',stall:'Lapak bazar'};
const deadlineLabel=value=>new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(value))+' WIB';

function RegistrationForm({event,mode,token,onBack,onSubmitted}){
  const [form,setForm]=useState({name:'',address:'',phone:'',rt:'',rw:'',businessName:'',productSummary:'',consent:false,website:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=(key,value)=>setForm(old=>({...old,[key]:value}));
  return <form className="registration-form" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{const result=await api(token?'/event-registrations/revision':'/event-registrations',{method:token?'PUT':'POST',body:{...form,eventId:event.id,mode,...(token?{token}:{})}});onSubmitted(result);}catch(err){setError(err.message);}finally{setBusy(false);}
  }}>
    <h3>{token?'Perbaiki pendaftaran':mode==='stall'?'Ajukan lapak bazar':'Daftar sebagai peserta'}</h3>
    <p className="form-intro">{event.title}. {token?'Isi kembali data lengkap sesuai catatan admin.':'Setiap pengajuan diperiksa admin. Satu formulir untuk satu pemohon; kuota terpakai setelah disetujui.'}</p>
    <div className="form-grid">
      <Field label="Nama lengkap" autoComplete="name" required minLength={3} maxLength={120} value={form.name} onChange={e=>change('name',e.target.value)}/>
      <Field label="Nomor HP / WhatsApp" type="tel" autoComplete="tel" required maxLength={25} placeholder="Contoh: 081234567890" help="Gunakan nomor aktif yang dapat dihubungi pengelola." value={form.phone} onChange={e=>change('phone',e.target.value)}/>
    </div>
    <Field label="Alamat tempat tinggal lengkap"><textarea autoComplete="street-address" required minLength={10} maxLength={500} placeholder="Jalan/kampung, nomor rumah, desa/kelurahan, kecamatan" value={form.address} onChange={e=>change('address',e.target.value)}/></Field>
    <div className="form-grid registration-area">
      <Field label="RT" inputMode="numeric" required pattern="[0-9]{1,3}" maxLength={3} placeholder="Contoh: 003" value={form.rt} onChange={e=>change('rt',e.target.value)}/>
      <Field label="RW" inputMode="numeric" required pattern="[0-9]{1,3}" maxLength={3} placeholder="Contoh: 002" value={form.rw} onChange={e=>change('rw',e.target.value)}/>
    </div>
    {mode==='stall'&&<><Field label="Nama usaha" required minLength={3} maxLength={150} value={form.businessName} onChange={e=>change('businessName',e.target.value)}/><Field label="Produk yang akan dijual"><textarea required minLength={5} maxLength={1500} placeholder="Jenis produk dan kebutuhan lapak yang ingin disampaikan kepada panitia." value={form.productSummary} onChange={e=>change('productSummary',e.target.value)}/></Field></>}
    <div className="privacy-note"><ShieldCheck size={19}/><p>Nama pemohon, alamat rumah, nomor HP/WhatsApp, dan RT/RW hanya digunakan admin untuk mengelola pendaftaran. Data ini tidak ditampilkan kepada pengunjung.</p></div>
    <label className="check-field"><input type="checkbox" required checked={form.consent} onChange={e=>change('consent',e.target.checked)}/><span>Saya menyatakan data di atas benar dan menyetujui penggunaannya untuk verifikasi serta komunikasi kegiatan ini.</span></label>
    <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label></div>
    <Notice error>{error}</Notice><div className="form-actions"><button className="button" disabled={busy}>{busy?'Mengirim…':token?'Kirim perbaikan':'Kirim pendaftaran'}</button><button type="button" className="button secondary" disabled={busy} onClick={onBack}>Kembali</button></div>
  </form>;
}
function Receipt({receipt}){
  const [copied,setCopied]=useState(false),[error,setError]=useState('');
  return <div className="receipt registration-receipt"><CheckCircle size={42}/><h3>Pendaftaran diterima</h3><p>Menunggu peninjauan admin. Simpan kode pribadi ini untuk mengecek keputusan dan mengirim perbaikan melalui “Cek pendaftaran” di halaman Agenda.</p><div className="tracking-code">{receipt.token}</div><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(receipt.token);setCopied(true);setError('');}catch{setError('Salin kode yang tampil di atas secara manual.');}}}><Clipboard/>{copied?'Kode tersalin':'Salin kode pendaftaran'}</button><Notice>{error}</Notice><p className="small muted">Kode hanya ditampilkan saat pengiriman berhasil. Simpan secara pribadi.</p></div>;
}
export function EventSignup({event}){
  const [current,setCurrent]=useState(event),[mode,setMode]=useState(''),[receipt,setReceipt]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true;api('/content').then(data=>{if(alive)setCurrent(data.events.find(e=>e.id===event.id)||{...event,enrollment:null});}).catch(()=>{if(alive)setError('Kuota terbaru belum dapat dimuat. Buka ulang detail kegiatan untuk mencoba lagi.');});return()=>{alive=false;};},[event.id]);
  const enrollment=current.enrollment;
  if(receipt)return <Receipt receipt={receipt}/>;
  if(mode)return <RegistrationForm event={current} mode={mode} onBack={()=>setMode('')} onSubmitted={setReceipt}/>;
  if(!enrollment||(!enrollment.participant.capacity&&!enrollment.stall.capacity))return null;
  const open=enrollment.open&&enrollment.closesAt>new Date().toISOString()&&!error;
  return <section className="event-signup"><div className="section-heading"><h3>Ikut kegiatan desa</h3><span className={'status '+(open?'approved':'cancelled')}>{open?'Pendaftaran dibuka':'Pendaftaran ditutup'}</span></div><p className="small muted">Batas pendaftaran: {deadlineLabel(enrollment.closesAt)}. Persetujuan mengikuti ketersediaan kuota.</p><Notice error>{error}</Notice><div className="registration-options">{Object.entries(registrationModes).filter(([key])=>enrollment[key].capacity>0).map(([key,label])=>{const quota=enrollment[key],remaining=Math.max(0,quota.capacity-quota.approved),Icon=key==='stall'?Store:Users;return <div className="registration-option" key={key}><Icon size={22}/><h4>{label}</h4><strong>{remaining}<small> / {quota.capacity} tempat tersisa</small></strong><p>{key==='stall'?'Ajukan usaha dan produk yang akan dibawa ke bazar.':'Daftarkan diri untuk mengikuti kegiatan ini.'}</p><button className="button secondary" disabled={!open||!remaining} onClick={()=>setMode(key)}>{!remaining?'Kuota penuh':!open?'Pendaftaran ditutup':key==='stall'?'Ajukan lapak bazar':'Daftar peserta'}</button></div>;})}</div></section>;
}
export function TrackRegistration({onClose}){
  const [token,setToken]=useState(''),[usedToken,setUsedToken]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[receipt,setReceipt]=useState(null);
  return <Modal title="Cek pendaftaran kegiatan" onClose={onClose} wide>{receipt?<Receipt receipt={receipt}/>:editing?<RegistrationForm event={{id:result.eventId,title:result.title}} mode={result.mode} token={usedToken} onBack={()=>setEditing(false)} onSubmitted={setReceipt}/>:<><p className="form-intro">Periksa pendaftaran peserta atau lapak bazar dengan kode pribadi yang diberikan saat mengirim formulir.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setResult(null);try{setResult(await api('/event-registrations/status',{method:'POST',body:{token}}));setUsedToken(token.trim());}catch(err){setError(err.message);}finally{setBusy(false);}}}><Field label="Kode pribadi pendaftaran" autoComplete="off" required value={token} onChange={e=>setToken(e.target.value)}/><button className="button" disabled={busy}>{busy?'Memeriksa…':'Periksa status'}</button></form><Notice error>{error}</Notice>{result&&<div className="tracking-result"><span className={'status '+result.status}>{registrationLabels[result.status]}</span><h3>{result.title}</h3><p>{registrationModes[result.mode]} · {dateLabel(result.date)}</p><p className="small muted">Status kegiatan: {result.eventStatus}{result.attended?' · Kehadiran tercatat':''}</p>{result.note&&<div className="moderator-note"><strong>Catatan admin</strong><p>{result.note}</p></div>}{result.status==='revision'&&<button className="button" onClick={()=>setEditing(true)}>Perbaiki pendaftaran</button>}<p className="small muted">Status dapat diperiksa di sini. Pemberitahuan WhatsApp tidak dikirim otomatis.</p></div>}</>}</Modal>;
}
export function EnrollmentSettings({form,change}){
  return <fieldset className="checkbox-group enrollment-settings"><legend>Pendaftaran peserta & lapak bazar</legend><label className="check-field"><input type="checkbox" checked={!!form.registrationOpen} onChange={e=>change('registrationOpen',e.target.checked)}/><span>Buka pendaftaran online setelah agenda diterbitkan</span></label><div className="form-grid"><Field label="Kuota peserta" type="number" min={0} max={10000} required value={form.participantCapacity??0} onChange={e=>change('participantCapacity',e.target.value)}/><Field label="Kuota lapak bazar" type="number" min={0} max={10000} required value={form.stallCapacity??0} onChange={e=>change('stallCapacity',e.target.value)}/></div><Field label="Batas tanggal pendaftaran (opsional)" type="date" max={form.date} value={form.registrationDeadline||''} onChange={e=>change('registrationDeadline',e.target.value)}/><small>Isi kuota 0 untuk jenis yang tidak digunakan. Tanpa batas tanggal, pendaftaran ditutup saat kegiatan dimulai (WIB). Agenda ditunda, dibatalkan, selesai, draf, atau arsip tidak menerima pendaftaran. Semua pemohon wajib mengisi nama, alamat, HP/WA, RT dan RW.</small></fieldset>;
}

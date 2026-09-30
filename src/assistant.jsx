// Asisten Desa: Telegram-style numbered menu bot driven by chatbot_nodes/options, with handover to a
// token-based live chat. Also the emergency call sheet. Both are opened through window events.
import React,{useEffect,useRef,useState} from 'react';
import {Send,Phone,Siren,ShieldAlert,HeartPulse,Flame,Landmark,PhoneCall,UserRound,ArrowLeft,Bot} from 'lucide-react';
import {Modal,Field,Notice,api,navigate,openEmergency,telHref,timeLabel} from './lib.jsx';
import {chatCategories} from '../server/portal-schema.mjs';

const TOKEN_KEY='mm_chat_token';
const keycap=n=>n>=0&&n<=9?n+'\uFE0F\u20E3':n===10?'🔟':n+'.';
const getToken=()=>{try{return localStorage.getItem(TOKEN_KEY)||'';}catch{return '';}};
const setToken=t=>{try{t?localStorage.setItem(TOKEN_KEY,t):localStorage.removeItem(TOKEN_KEY);}catch{}};

function useBot(portal,{close,toChat}){
  const {nodes,options}=portal.chatbot,[log,setLog]=useState([]),[choices,setChoices]=useState([]);const seq=useRef(0);
  const say=(from,text)=>setLog(l=>[...l,{id:++seq.current,from,text}]);
  const root=()=>nodes.find(n=>n.action_type==='start');
  const back=[{n:0,label:'Kembali ke menu utama',run:()=>show(root())}];
  const handover=text=>{say('bot',text||'Pertanyaan Anda belum dapat dijawab otomatis.\n\nApakah Anda ingin terhubung dengan Admin Desa?');setChoices([{n:1,label:'Ya, Hubungi Admin',run:toChat},{n:2,label:'Kembali ke Menu',run:()=>show(root())}]);};
  const proceed=(text,label,go)=>{say('bot',text);setChoices([{n:1,label,run:go},...back]);};
  function show(node){
    if(!node)return handover(nodes.length?'Menu ini belum tersedia.\n\nApakah Anda ingin terhubung dengan Admin Desa?':'Asisten Desa belum diatur pengelola.\n\nApakah Anda ingin terhubung dengan Admin Desa?');
    if(node.action_type==='handover')return handover(node.message);
    say('bot',node.message);
    const list=options.filter(o=>o.node_id===node.id).sort((a,b)=>a.option_number-b.option_number||a.sort_order-b.sort_order).map(o=>({n:o.option_number,label:o.label,run:()=>act(o)}));
    const extra=node.action_type==='start'?[]:node.action_type==='answer'||!list.length?[...back,{n:9,label:'Hubungi Admin',run:()=>handover()}]:back;
    setChoices([...list,...extra.filter(e=>!list.some(l=>l.n===e.n))]);
  }
  function act(o){
    const byId=id=>nodes.find(n=>n.id===id);
    switch(o.action){
      case 'goto':return show(byId(o.target_node_id));
      case 'handover':return handover();
      case 'root':return show(root());
      case 'complaint':return proceed(`Baik. Silakan isi formulir pengaduan${o.action_value?' kategori '+o.action_value:''}. Anda akan menerima nomor tiket untuk mengecek perkembangannya.`,'Buka formulir pengaduan',()=>{close();navigate('/pengaduan?buat=1'+(o.action_value?'&kategori='+encodeURIComponent(o.action_value):''));});
      case 'track':return proceed('Siapkan nomor tiket Anda, misalnya TIK-023, lalu buka halaman Cek Pengaduan.','Buka Cek Pengaduan',()=>{close();navigate('/pengaduan?tab=cek');});
      case 'link':return proceed('Informasi lengkap tersedia pada halaman berikut.','Buka halaman',()=>{close();navigate(o.action_value);});
      case 'emergency':close();return openEmergency();
      case 'faq':{
        const faqs=portal.faqs.slice(0,9);if(!faqs.length)return handover('Belum ada FAQ.\n\nApakah Anda ingin terhubung dengan Admin Desa?');
        say('bot','Pilih pertanyaan:');
        return setChoices([...faqs.map((f,i)=>({n:i+1,label:f.question,run:()=>{say('bot',f.answer);setChoices([...back,{n:9,label:'Belum terjawab, hubungi Admin',run:()=>handover()}]);}})),...back]);
      }
      default:return handover();
    }
  }
  const choose=c=>{say('user',keycap(c.n)+' '+c.label);c.run();};
  const reset=()=>{setLog([]);show(root());};
  return {log,choices,choose,reset};
}

function StartChat({onStarted,onBack}){
  const [f,setF]=useState({name:'',phone:'',category:chatCategories[0],message:'',website:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const ch=(k,v)=>setF(o=>({...o,[k]:v}));
  return <form className="chat-start" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await api('/chat/start',{method:'POST',body:f});setToken(r.token);onStarted(r.token);}catch(x){setError(x.message);}finally{setBusy(false);}}}>
    <button type="button" className="plain-link back-link" onClick={onBack}><ArrowLeft size={16}/>Kembali ke menu</button>
    <p className="form-intro">Tulis pertanyaan Anda. Admin Desa membalas pada jam pelayanan; buka kembali Asisten Desa untuk melihat balasan.</p>
    <Field label="Nama" required minLength={2} maxLength={80} autoComplete="name" value={f.name} onChange={e=>ch('name',e.target.value)}/>
    <Field label="Nomor WhatsApp (opsional)" type="tel" inputMode="tel" placeholder="081234567890" value={f.phone} onChange={e=>ch('phone',e.target.value)} help="Diisi jika Anda bersedia dihubungi kembali."/>
    <Field label="Topik"><select value={f.category} onChange={e=>ch('category',e.target.value)}>{chatCategories.map(c=><option key={c}>{c}</option>)}</select></Field>
    <Field label="Pertanyaan"><textarea required maxLength={2000} value={f.message} onChange={e=>ch('message',e.target.value)}/></Field>
    <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={e=>ch('website',e.target.value)}/></label></div>
    <Notice error>{error}</Notice><button className="button full" disabled={busy}><Send/>{busy?'Mengirim…':'Kirim ke Admin Desa'}</button>
  </form>;
}
function LiveChat({token,timeZone,onBack,onForget}){
  const [thread,setThread]=useState(null),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),end=useRef();
  const load=()=>api('/chat/thread',{method:'POST',body:{token}}).then(t=>{setThread(t);setError('');}).catch(e=>{setError(e.message);if(/tidak ditemukan/.test(e.message))onForget();});
  useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},5000);return()=>clearInterval(timer);},[token]);
  useEffect(()=>{end.current?.scrollIntoView({block:'end'});},[thread?.messages.length]);
  return <div className="live-chat">
    <div className="chat-toolbar"><button className="plain-link back-link" onClick={onBack}><ArrowLeft size={16}/>Menu bot</button>{thread&&<span className={'status '+(thread.status==='open'?'approved':'cancelled')}>{thread.status==='open'?'Terhubung dengan Admin Desa':'Ditandai selesai'}</span>}</div>
    <div className="chat-log" aria-live="polite">{thread?.messages.map(m=><div key={m.id} className={'bubble '+(m.sender==='citizen'?'me':'them')}><span className="bubble-who">{m.sender==='citizen'?'Anda':'Admin Desa'}</span><p>{m.body}</p><time>{timeLabel(m.created_at,timeZone)}</time></div>)}<div ref={end}/></div>
    {thread&&!thread.messages.some(m=>m.sender==='admin')&&<p className="small muted chat-wait">Pesan sudah terkirim. Balasan admin akan muncul di sini.</p>}
    {thread?.status==='closed'&&<p className="small muted chat-wait">Admin menandai percakapan ini selesai. Kirim pesan untuk membukanya kembali.</p>}
    <Notice error>{error}</Notice>
    <form className="chat-input" onSubmit={async e=>{e.preventDefault();if(!text.trim())return;setBusy(true);try{await api('/chat/send',{method:'POST',body:{token,body:text}});setText('');await load();}catch(x){setError(x.message);}finally{setBusy(false);}}}><label className="sr-only" htmlFor="chat-text">Tulis pesan</label><input id="chat-text" maxLength={2000} placeholder="Tulis pesan…" value={text} onChange={e=>setText(e.target.value)}/><button className="button" disabled={busy||!text.trim()} aria-label="Kirim pesan"><Send/></button></form>
    <button className="plain-link small forget" onClick={()=>{if(confirm('Hapus akses percakapan ini dari perangkat? Anda tidak dapat membukanya lagi.')){setToken('');onForget();}}}>Hapus percakapan dari perangkat ini</button>
  </div>;
}
export function Assistant({portal,site}){
  const [open,setOpen]=useState(false),[view,setView]=useState('bot'),[token,setTok]=useState(getToken);
  const close=()=>setOpen(false);
  const bot=useBot(portal,{close,toChat:()=>setView('chat')});
  const [input,setInput]=useState('');const [hint,setHint]=useState('');const logEnd=useRef();
  useEffect(()=>{const f=e=>{setOpen(true);setView(e.detail?.chat&&getToken()?'chat':'bot');};window.addEventListener('mm:assistant',f);return()=>window.removeEventListener('mm:assistant',f);},[]);
  useEffect(()=>{if(open&&view==='bot'&&!bot.log.length)bot.reset();},[open,view]);
  useEffect(()=>{logEnd.current?.scrollIntoView({block:'end'});},[bot.log.length,view]);
  if(!open)return null;
  return <Modal title={'Asisten Desa '+site.name} onClose={close} className="assistant-dialog">
    {view==='bot'?<div className="bot">
      {token&&<button className="resume-chat" onClick={()=>setView('chat')}><UserRound aria-hidden="true"/>Lanjutkan percakapan dengan Admin Desa</button>}
      <div className="chat-log" aria-live="polite">{bot.log.map(m=><div key={m.id} className={'bubble '+(m.from==='user'?'me':'them')}>{m.from==='bot'&&<span className="bubble-who"><Bot size={13} aria-hidden="true"/> Asisten Desa</span>}<p>{m.text}</p></div>)}<div ref={logEnd}/></div>
      <div className="quick-replies" role="group" aria-label="Pilihan balasan">{bot.choices.map(c=><button key={c.n+c.label} onClick={()=>{setHint('');bot.choose(c);}} aria-label={'Pilihan '+c.n+': '+c.label}><span aria-hidden="true">{keycap(c.n)}</span>{c.label}</button>)}</div>
      <form className="chat-input" onSubmit={e=>{e.preventDefault();const c=bot.choices.find(x=>String(x.n)===input.trim());if(c){setHint('');bot.choose(c);}else setHint('Pilihan tidak tersedia. Ketik salah satu nomor pada tombol di atas.');setInput('');}}><label className="sr-only" htmlFor="bot-number">Ketik nomor pilihan</label><input id="bot-number" inputMode="numeric" maxLength={2} placeholder="Atau ketik nomor pilihan, lalu Enter" value={input} onChange={e=>setInput(e.target.value)}/><button className="button secondary" aria-label="Kirim nomor pilihan"><Send/></button></form>
      <Notice>{hint}</Notice>
    </div>:token?<LiveChat token={token} timeZone={site.timezone} onBack={()=>setView('bot')} onForget={()=>{setTok('');setView('bot');}}/>
      :<StartChat onBack={()=>setView('bot')} onStarted={t=>setTok(t)}/>}
  </Modal>;
}

const emergencyIcons={darurat:Siren,polisi:ShieldAlert,medis:HeartPulse,pemadam:Flame,desa:Landmark,lainnya:PhoneCall};
export function EmergencySheet({contacts}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{const f=()=>setOpen(true);window.addEventListener('mm:emergency',f);return()=>window.removeEventListener('mm:emergency',f);},[]);
  if(!open)return null;
  const group=(scope,title)=>{const list=contacts.filter(c=>c.scope===scope&&c.phone);return list.length?<section className="emergency-group"><h3>{title}</h3><ul>{list.map(c=>{const Icon=emergencyIcons[c.category]||PhoneCall;return <li key={c.id}><span className="emergency-icon"><Icon aria-hidden="true"/></span><div><strong>{c.name}</strong><span className="emergency-number">{c.phone}</span>{c.description&&<p>{c.description}</p>}</div><a className="button call-button" href={telHref(c.phone)} aria-label={'Telepon '+c.name+' '+c.phone}><Phone/>TELEPON</a></li>;})}</ul></section>:null;};
  return <Modal title="Darurat" onClose={()=>setOpen(false)} className="sheet emergency-dialog">
    <p className="emergency-intro">Tekan <strong>TELEPON</strong> untuk langsung menghubungi. Utamakan keselamatan dan sebutkan lokasi dengan jelas.</p>
    {group('nasional','Nomor darurat nasional')}{group('lokal','Kontak lokal sekitar desa')}
    {!contacts.length&&<Notice error>Daftar nomor belum tersedia. Hubungi 112.</Notice>}
  </Modal>;
}

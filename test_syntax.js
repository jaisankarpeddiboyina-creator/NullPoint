const BASE = "http://localhost/api";
const KEY  = '';

let busy = false;

const $  = id => document.getElementById(id);
const esc = t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = t => t
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/`(.+?)`/g,'<code>$1</code>')
  .replace(/\n/g,'<br>');

let msgCount=0;
function resize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,150)+'px'}
function onKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
function go(btn){}
function scroll(){}
function hideEmpty(){}

function renderRich(content){}
function rImage(d){}
function rGallery(data, toolName){}
function rCard(tool, d){}
function rList(data){}
function rChart(d){}
function addUser(text){}
function addBot(){}

async function send(){
  const el=$('inp');
  const q=el.value.trim();
  if(!q||busy) return;
  busy=true; el.value=''; el.style.height='auto'; $('sendBtn').disabled=true;

  addUser(q);
  const botMsg=addBot();
  const bb=botMsg.bb, rc=botMsg.rc, mm=botMsg.mm;

  let text='', started=false, content=[];

  try{
    const resp=await fetch(`${BASE}/stream`,{
      method:'POST',
      headers:{'Content-Type':'application/json','X-NullPoint-Key':KEY},
      body:JSON.stringify({query:q})
    });
    if(!resp.ok) throw new Error(`Server ${resp.status}. Is NullPoint running?`);

    const reader=resp.body.getReader();
    const dec=new TextDecoder();
    let buf='';

    while(true){
      const{done,value}=await reader.read();
      if(done) break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');
      buf=lines.pop()||'';

      for(const line of lines){
        if(!line.startsWith('data:')) continue;
        try{
          const d=JSON.parse(line.slice(5));
          if(d.token!==undefined){
            if(!started){bb.innerHTML='';started=true}
            text+=d.token;
            bb.innerHTML=fmt(text)+'<span class="cursor"></span>';
            scroll();
          }
          if(d.content){
            if(!started){bb.innerHTML='';started=true}
            if(Array.isArray(d.content)){
              content=content.concat(d.content);
            }else if(d.content){
              content.push(d.content);
            }
            if(content.length>0){
              rc.innerHTML=renderRich(content);
              scroll();
            }
          }
          if(d.toolsUsed!==undefined){
            if(!started){bb.innerHTML='';started=true}
            bb.innerHTML=fmt(text);
            if(content.length>0){
              rc.innerHTML=renderRich(content);
            }
            if(d.toolsUsed.length) mm.innerHTML=d.toolsUsed.map(t=>`<span class="badge">${t}</span>`).join('')+`<span>${d.duration}ms</span>`;
          }
          if(d.message) throw new Error(d.message);
        }catch(e){if(e.message&&!e.message.includes('JSON')) throw e}
      }
    }
    if (started && text) {
      await window.saveToHistory(q, text);
    }
  }catch(e){
    bb.innerHTML='<span style="color:var(--red)">⚠ '+esc(e.message)+'</span>';
  }

  busy=false; $('sendBtn').disabled=false; $('inp').focus();
}

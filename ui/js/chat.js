const BASE = `${window.location.origin}/api`
const KEY  = localStorage.getItem('np_key') || ''

let busy = false
let chatMessageCount = 0
const MAX_MESSAGES_PER_CHAT = { free: 10, basic: 20, pro: 50 }

const $  = id => document.getElementById(id)

let msgCount=0
function resize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,150)+'px'}
function onKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}
function go(btn){$('inp').value=btn.textContent.replace(/^[^\w₿🌤🚀🎌📚🎨🔐🧬🏎🌍🖼😄]+/,'').trim();resize($('inp'));send()}
function scroll(){const m=$('msgs');m.scrollTop=m.scrollHeight}
function hideEmpty(){const e=$('empty');if(e)e.remove()}

// ── Add messages ────────────────────────────────────────────────
function addUser(text){
  hideEmpty()
  const el=document.createElement('div')
  el.className='msg msg-u'
  el.innerHTML=`<div class="bubble bubble-u">${esc(text)}</div>`
  $('msgs').appendChild(el)
  scroll()

  chatMessageCount++
  if (typeof window.checkUsage === 'function') {
    window.checkUsage().then(usage => {
      const max = MAX_MESSAGES_PER_CHAT[usage.plan] || 10
      if (chatMessageCount >= max) {
        setTimeout(() => {
          if(confirm('Long conversation detected. Start a new chat to keep responses accurate and fast?')) {
            newChat()
            chatMessageCount = 0
          }
        }, 500)
      }
    }).catch(() => {})
  }
}

function addBot(){
  msgCount++
  const mid='msg'+msgCount
  const el=document.createElement('div')
  el.className='msg msg-a'
  el.innerHTML=`
    <div class="bubble bubble-a" id="bb${mid}">
      <div class="thinking"><div class="dots"><span></span><span></span><span></span></div>Thinking...</div>
    </div>
    <div class="rich" id="rc${mid}"></div>
    <div class="meta" id="mm${mid}"></div>`
  $('msgs').appendChild(el)
  scroll()
  return {id:mid, bb:$('bb'+mid), rc:$('rc'+mid), mm:$('mm'+mid)}
}

// ── Send ────────────────────────────────────────────────────────
async function send() {
  const el = $('inp')
  const q = el.value.trim()
  if (!q || busy) return

  // window.checkUsage is always defined from globals.js
  // Firebase overrides it with real quota checking once loaded
  let usage = { allowed: true, plan: 'free', used: 0, limit: 20 }
  try {
    usage = await window.checkUsage()
  } catch(e) {
    // checkUsage failed — allow the query rather than block the user
    console.warn('checkUsage failed:', e.message)
  }

  if (!usage.allowed) {
    window.showPaywall(usage.used, usage.limit, usage.plan)
    return
  }

  busy = true
  el.value = ''
  el.style.height = 'auto'
  $('sendBtn').disabled = true

  let text = '', started = false, content = []
  let bb, rc, mm

  try {
    addUser(q)
    const botMsg = addBot()
    bb = botMsg.bb; rc = botMsg.rc; mm = botMsg.mm

    const resp = await fetch(`${BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NullPoint-Key': KEY },
      body: JSON.stringify({ query: q })
    })
    if (!resp.ok) throw new Error(`Server ${resp.status}. Is NullPoint running?`)

    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        try {
          const d = JSON.parse(line.slice(5))
          if (d.token !== undefined) {
            if (!started) { bb.innerHTML = ''; started = true }
            text += d.token
            bb.innerHTML = fmt(text) + '<span class="cursor"></span>'
            scroll()
          }
          if (d.content) {
            if (!started) { bb.innerHTML = ''; started = true }
            if (Array.isArray(d.content)) {
              content = content.concat(d.content)
            } else {
              content.push(d.content)
            }
            if (content.length > 0) {
              rc.innerHTML = renderRich(content)
              scroll()
            }
          }
          if (d.toolsUsed !== undefined) {
            if (!started) { bb.innerHTML = ''; started = true }
            bb.innerHTML = fmt(text)
            if (content.length > 0) rc.innerHTML = renderRich(content)
            if (d.toolsUsed.length) {
              mm.innerHTML = d.toolsUsed.map(t => `<span class="badge">${t}</span>`).join('') + `<span>${d.duration}ms</span>`
            }
          }
          if (d.message) throw new Error(d.message)
        } catch(e) {
          if (e.message && !e.message.includes('JSON')) throw e
        }
      }
    }

    if (started && text) {
      window.saveToHistory(q, text).catch(e => console.warn('History save failed:', e))
      window.incrementUsage().catch(e => console.warn('Usage increment failed:', e))
    }
  } catch(e) {
    if (bb) bb.innerHTML = `<span style="color:var(--red)">⚠ ${esc(e.message)}</span>`
  } finally {
    busy = false
    $('sendBtn').disabled = false
    $('inp').focus()
  }
}

async function newChat(){
  chatMessageCount = 0
  try{await fetch(`${BASE}/reset`,{method:'POST',headers:{'X-NullPoint-Key':KEY}})}catch(e){}
  $('msgs').innerHTML=`<div class="empty" id="empty">
    <div class="empty-logo"><span>NULL</span><span>POINT</span></div>
    <p class="empty-sub">Real-time data from the entire world. One question away.</p>
    <div class="chips">
      <button class="chip" onclick="go(this)">🌤 Weather in Tokyo</button>
      <button class="chip" onclick="go(this)">₿ Bitcoin price now</button>
      <button class="chip" onclick="go(this)">🚀 Latest space news</button>
      <button class="chip" onclick="go(this)">🎌 Anime: Attack on Titan</button>
      <button class="chip" onclick="go(this)">📚 Books by Dostoevsky</button>
      <button class="chip" onclick="go(this)">🎨 Monet paintings</button>
      <button class="chip" onclick="go(this)">🔐 CVE vulnerabilities</button>
      <button class="chip" onclick="go(this)">🖼 Generate image: neon city rain</button>
    </div>
  </div>`
}

window.onload=()=>{
  $('inp').focus()
  console.log('send ready, busy=', busy)
  // API key can be set via env file or localStorage
}

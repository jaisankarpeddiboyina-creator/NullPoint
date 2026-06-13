const esc = t => String(t || '')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#x27;')
  .replace(/\//g,'&#x2F;')

const sanitizeUrl = u => {
  if (!u) return ''
  const trimmed = String(u).trim()
  if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
    return '#'
  }
  return esc(trimmed)
}

const fmt = t => {
  if (!t) return ''
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`(.+?)`/g,'<code>$1</code>')
    .replace(/\n/g,'<br>')
}

// ── Render rich content ─────────────────────────────────────────
function renderRich(content){
  return content.map(rc=>{
    switch(rc.type){
      case 'image':   return rImage(rc.data)
      case 'gallery': return rGallery(rc.data, rc.toolName)
      case 'card':    return rCard(rc.toolName, rc.data)
      case 'list':    return rList(rc.data)
      case 'chart':   return rChart(rc.data)
      default:        return ''
    }
  }).join('')
}

function rImage(d){
  if(!d) return ''
  const url = d.url || d.message || d.hdurl
  if(!url) return ''
  const sanitized = sanitizeUrl(url)
  const cap = d.caption || d.title || d.prompt || ''
  const desc = d.explanation ? `<div class="r-img-cap">${esc(d.explanation.slice(0,200))}...</div>` : ''
  return `<div class="r-img">
    <img src="${sanitized}" alt="${esc(cap)}" loading="lazy" onerror="this.parentElement.style.display='none'">
    ${cap?`<div class="r-img-cap">${esc(cap)}</div>`:''}${desc}
  </div>`
}

function rGallery(data, toolName){
  if(!Array.isArray(data)) return rImage(data)
  const items = data.slice(0,8).map(item=>{
    let img='', lbl=''
    if(toolName==='getPokemon'){img=item.sprite;lbl=item.name}
    else if(toolName==='getWikipediaSummary'){img=item.thumbnail;lbl=item.title}
    else{ img=item.image||item.cover||item.strMealThumb||item.thumbnail;lbl=item.name||item.title||item.strMeal||item.titleEnglish||'' }
    if(!img) return ''
    const imgUrl = sanitizeUrl(img)
    return `<div class="g-item">
      <img src="${imgUrl}" alt="${esc(lbl)}" loading="lazy" onerror="this.parentElement.style.display='none'">
      <div class="g-item-lbl">${esc(lbl)}</div>
    </div>`
  }).join('')
  if(!items.trim()) return ''
  return `<div class="r-gallery">${items}</div>`
}

function rCard(tool, d){
  if(!d) return ''
  if(tool==='getWeather'){
    const c=d.current||{}
    const wc=c.weather_code
    const icon=wc==0?'☀️':wc<=3?'⛅':wc<=48?'🌫️':wc<=67?'🌧️':wc<=77?'❄️':wc<=82?'🌦️':'⛈️'
    return `<div class="r-card">
      <div class="card-ttl">${icon} ${esc(d.location||'Weather')}</div>
      <div class="card-grid">
        <div class="ci"><div class="ci-lbl">Temperature</div><div class="ci-val">${esc(String(c.temperature_2m??'--'))}°C</div></div>
        <div class="ci"><div class="ci-lbl">Feels Like</div><div class="ci-val">${esc(String(c.apparent_temperature??'--'))}°C</div></div>
        <div class="ci"><div class="ci-lbl">Humidity</div><div class="ci-val">${esc(String(c.relative_humidity_2m??'--'))}%</div></div>
        <div class="ci"><div class="ci-lbl">Wind</div><div class="ci-val">${esc(String(c.wind_speed_10m??'--'))} km/h</div></div>
      </div></div>`
  }
  if(tool==='getCryptoPrice'&&Array.isArray(d)){
    const rows=d.slice(0,4).map(c=>{
      const chg=c.price_change_percentage_24h||0
      return `<div class="ci">
        <div class="ci-lbl">${esc((c.symbol||'').toUpperCase())}</div>
        <div class="ci-val">$${esc((c.current_price||0).toLocaleString(undefined,{maximumFractionDigits:2}))}</div>
        <div class="ci-lbl ${chg>=0?'pos':'neg'}" style="color:${chg>=0?'var(--green)':'var(--red)'}">${chg>=0?'▲':'▼'} ${esc(Math.abs(chg).toFixed(2))}%</div>
      </div>`}).join('')
    return `<div class="r-card"><div class="card-ttl">💹 Crypto Prices</div><div class="card-grid">${rows}</div></div>`
  }
  if(tool==='getCountryInfo'){
    const c=Array.isArray(d)?d[0]:d
    if(!c) return ''
    return `<div class="r-card">
      <div class="card-ttl">${esc(c.flag||'🌍')} ${esc(c.name?.common||'')}</div>
      <div class="card-grid">
        <div class="ci"><div class="ci-lbl">Capital</div><div class="ci-val" style="font-size:13px">${esc(c.capital?.[0]||'--')}</div></div>
        <div class="ci"><div class="ci-lbl">Population</div><div class="ci-val" style="font-size:13px">${esc((c.population||0).toLocaleString())}</div></div>
        <div class="ci"><div class="ci-lbl">Region</div><div class="ci-val" style="font-size:13px">${esc(c.region||'--')}</div></div>
        <div class="ci"><div class="ci-lbl">Currency</div><div class="ci-val" style="font-size:13px">${esc(Object.keys(c.currencies||{})[0]||'--')}</div></div>
      </div></div>`
  }
  if(tool==='getGithubUser'){
    const avatarUrl = sanitizeUrl(d.avatar)
    return `<div class="r-card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        ${avatarUrl?`<img src="${avatarUrl}" style="width:44px;height:44px;border-radius:50%;border:2px solid var(--b2)">`:''}
        <div><div style="font-weight:700">${esc(d.name||d.login)}</div><div style="font-size:12px;color:var(--t2)">@${esc(d.login)}</div></div>
      </div>
      <div class="card-grid">
        <div class="ci"><div class="ci-lbl">Followers</div><div class="ci-val">${esc((d.followers||0).toLocaleString())}</div></div>
        <div class="ci"><div class="ci-lbl">Repos</div><div class="ci-val">${esc(String(d.public_repos||0))}</div></div>
      </div></div>`
  }
  return ''
}

function rList(data){
  if(!Array.isArray(data)||!data.length) return ''
  return '<div class="r-list">'+data.slice(0,8).map(function(item){
    const title=item.title||item.name||item.question||`${item.driver||''} ${item.points?`(${item.points}pts)`:''}`
    const rawUrl=item.url||item.link||item.html_url||''
    const url=sanitizeUrl(rawUrl)
    const sub=item.summary||item.snippet||item.description||''
    const meta=[
      item.score&&`⭐ ${item.score}`,
      item.by&&`by ${item.by}`,
      item.published&&new Date(item.published).toLocaleDateString(),
      item.status,item.position&&`#${item.position}`,
      item.remote&&'🌎 Remote',item.severity&&`🔴 ${item.severity}`,
    ].filter(Boolean).slice(0,3)
    return '<div class="li">'
      +(url && url !== '#'?'<a href="'+url+'" target="_blank" rel="noopener">'+esc(title)+'</a>':'<div style="font-size:13px;font-weight:500;margin-bottom:3px">'+esc(title)+'</div>')
      +(sub?'<div class="li-sub">'+esc(sub.slice(0,120))+'...</div>':'')
      +'<div class="li-meta">'+meta.map(function(m){return '<span>'+esc(String(m))+'</span>'}).join('')+'</div>'
      +'</div>'
  }).join('')+'</div>'
}

function rChart(d){
  if(!d||!d.data||!d.data.length) return ''
  const vals=d.data.map(function(x){return x.value}).filter(function(v){return v!=null})
  const max=Math.max.apply(null,vals)||1
  return '<div class="r-chart">'
    +'<div class="chart-ttl">'+esc(d.country||'')+' — '+esc(d.indicator||'')+'</div>'
    +'<div class="bars">'+d.data.slice(-8).map(function(x){
      const pct=(x.value/max)*100
      return '<div class="bar-wrap">'
        +'<div class="bar" style="height:'+pct+'%" title="'+esc(x.value?x.value.toLocaleString():'')+'"></div>'
        +'<div class="bar-lbl">'+esc(String(x.year))+'</div>'
        +'</div>'
    }).join('')+'</div>'
    +'</div>'
}

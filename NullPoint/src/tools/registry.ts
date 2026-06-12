/**
 * NullPoint — Tools Registry
 * 20+ world-class APIs. Zero auth. One registration loop.
 * Wrapped with AILink — observable, orchestratable, unstoppable.
 */

import { AILink } from '@ailink/sdk'
import { remember } from '../rag/memory'

// Captured tool results for rich UI rendering
export const lastResults: Record<string, any> = {}

async function get(url: string, params?: Record<string, any>): Promise<any> {
  const fullUrl = params ? `${url}?${new URLSearchParams(params as any)}` : url
  const res = await fetch(fullUrl, { headers: { 'User-Agent': 'NullPoint/1.0' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

function reg(ai: AILink, name: string, fn: (a: any) => Promise<any>, description: string, parameters: any, group: string) {
  ai.register(name, async (args: any) => {
    const result = await fn(args)
    lastResults[name] = result
    remember(name, result)
    return result
  }, { description, parameters, group })
}

export function registerTools(ai: AILink) {

  // ── WEATHER ──────────────────────────────────────────────────────
  reg(ai, 'getWeather',
    async ({ location, days = 3 }) => {
      const geo = await get('https://geocoding-api.open-meteo.com/v1/search', { name: location, count: 1, language: 'en', format: 'json' })
      if (!geo.results?.length) return { error: `Location not found: ${location}` }
      const { latitude, longitude, name, country } = geo.results[0]
      const w = await get('https://api.open-meteo.com/v1/forecast', {
        latitude, longitude,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'auto', forecast_days: days
      })
      return { location: `${name}, ${country}`, ...w }
    },
    'Get current weather and forecast for any city worldwide. Returns temperature, humidity, wind speed, and daily forecasts.',
    { type: 'object', properties: { location: { type: 'string', description: 'City name (e.g. Tokyo, London, New York)' }, days: { type: 'number', description: 'Forecast days 1-7 (default 3)' } }, required: ['location'] },
    'weather'
  )

  // ── WIKIPEDIA ────────────────────────────────────────────────────
  reg(ai, 'searchWikipedia',
    async ({ query }) => {
      const d = await get('https://en.wikipedia.org/w/api.php', { action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: 5, origin: '*' })
      return d.query?.search || []
    },
    'Search Wikipedia for any topic. Returns matching articles with titles and descriptions.',
    { type: 'object', properties: { query: { type: 'string', description: 'Search term' } }, required: ['query'] },
    'knowledge'
  )

  reg(ai, 'getWikipediaSummary',
    async ({ title }) => {
      const d = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      return { title: d.title, summary: d.extract, url: d.content_urls?.desktop?.page, thumbnail: d.thumbnail?.source || null }
    },
    'Get a full Wikipedia summary and thumbnail image for a specific article.',
    { type: 'object', properties: { title: { type: 'string', description: 'Wikipedia article title' } }, required: ['title'] },
    'knowledge'
  )

  // ── NEWS ─────────────────────────────────────────────────────────
  reg(ai, 'getTopNews',
    async ({ limit = 10 }) => {
      const ids = await get('https://hacker-news.firebaseio.com/v0/topstories.json')
      const stories = await Promise.all(ids.slice(0, limit).map((id: number) => get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)))
      return stories.map((s: any) => ({ title: s.title, url: s.url, score: s.score, by: s.by, time: new Date(s.time * 1000).toISOString() }))
    },
    'Get top trending tech and startup news from HackerNews right now.',
    { type: 'object', properties: { limit: { type: 'number', description: 'Number of stories (default 10)' } }, required: [] },
    'news'
  )

  reg(ai, 'getSpaceNews',
    async ({ limit = 8, search }) => {
      const params: any = { limit, ordering: '-published_at' }
      if (search) params.search = search
      const d = await get('https://api.spaceflightnewsapi.net/v4/articles/', params)
      return d.results?.map((a: any) => ({ title: a.title, summary: a.summary, url: a.url, image: a.image_url, published: a.published_at, site: a.news_site }))
    },
    'Get latest space, astronomy, and NASA news articles.',
    { type: 'object', properties: { limit: { type: 'number' }, search: { type: 'string', description: 'Filter by keyword' } }, required: [] },
    'news'
  )

  // ── CRYPTO & FINANCE ─────────────────────────────────────────────
  reg(ai, 'getCryptoPrice',
    async ({ coins = 'bitcoin,ethereum', currency = 'usd' }) => {
      return await get('https://api.coingecko.com/api/v3/coins/markets', { vs_currency: currency, ids: coins, order: 'market_cap_desc', per_page: 10, page: 1, sparkline: false })
    },
    'Get live cryptocurrency prices, market cap, and 24h change for Bitcoin, Ethereum, and any other coins.',
    { type: 'object', properties: { coins: { type: 'string', description: 'Comma-separated coin IDs e.g. "bitcoin,ethereum,solana"' }, currency: { type: 'string', description: 'Currency (default: usd)' } }, required: [] },
    'finance'
  )

  reg(ai, 'getCurrencyRates',
    async ({ base = 'USD', to }) => {
      const params: any = { base }
      if (to) params.to = to
      return await get('https://api.frankfurter.app/latest', params)
    },
    'Get live currency exchange rates for any world currency.',
    { type: 'object', properties: { base: { type: 'string', description: 'Base currency code e.g. USD, EUR, GBP' }, to: { type: 'string', description: 'Target currency (optional)' } }, required: [] },
    'finance'
  )

  // ── SCIENCE & NASA ───────────────────────────────────────────────
  reg(ai, 'getNASAImageOfDay',
    async ({ date }) => {
      const params: any = { api_key: 'DEMO_KEY' }
      if (date) params.date = date
      return await get('https://api.nasa.gov/planetary/apod', params)
    },
    'Get NASA Astronomy Picture of the Day with title and explanation.',
    { type: 'object', properties: { date: { type: 'string', description: 'Date YYYY-MM-DD (optional, defaults to today)' } }, required: [] },
    'science'
  )

  reg(ai, 'searchResearchPapers',
    async ({ query, limit = 5 }) => {
      const raw = await get(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=relevance`)
      const entries = String(raw).match(/<entry>([\s\S]*?)<\/entry>/g) || []
      return entries.map((e: string) => ({
        title: e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim(),
        summary: e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim()?.slice(0, 250) + '...',
        published: e.match(/<published>(.*?)<\/published>/)?.[1],
        link: e.match(/href="(https:\/\/arxiv\.org\/abs\/[^"]+)"/)?.[1]
      }))
    },
    'Search scientific research papers on arXiv. Covers physics, math, CS, biology, economics and more.',
    { type: 'object', properties: { query: { type: 'string', description: 'Research topic or keywords' }, limit: { type: 'number', description: 'Number of papers (default 5)' } }, required: ['query'] },
    'science'
  )

  // ── BOOKS ────────────────────────────────────────────────────────
  reg(ai, 'searchBooks',
    async ({ query, limit = 5 }) => {
      const d = await get('https://openlibrary.org/search.json', { q: query, limit, fields: 'title,author_name,first_publish_year,cover_i,subject' })
      return d.docs?.map((b: any) => ({
        title: b.title, authors: b.author_name?.slice(0, 2), year: b.first_publish_year,
        subjects: b.subject?.slice(0, 4),
        cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null
      }))
    },
    'Search millions of books. Returns title, author, year, and cover image.',
    { type: 'object', properties: { query: { type: 'string', description: 'Book title, author, or topic' }, limit: { type: 'number' } }, required: ['query'] },
    'books'
  )

  // ── MOVIES & TV ──────────────────────────────────────────────────
  reg(ai, 'searchShows',
    async ({ query }) => {
      const d = await get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
      return d?.slice(0, 5).map((r: any) => ({
        name: r.show.name, genres: r.show.genres, status: r.show.status,
        rating: r.show.rating?.average,
        summary: r.show.summary?.replace(/<[^>]*>/g, '').slice(0, 180),
        image: r.show.image?.medium, premiered: r.show.premiered, network: r.show.network?.name
      }))
    },
    'Search TV shows. Returns genres, rating, status, and poster image.',
    { type: 'object', properties: { query: { type: 'string', description: 'TV show name' } }, required: ['query'] },
    'entertainment'
  )

  // ── ANIME ────────────────────────────────────────────────────────
  reg(ai, 'searchAnime',
    async ({ query, limit = 5 }) => {
      const d = await get('https://api.jikan.moe/v4/anime', { q: query, limit })
      return d.data?.map((a: any) => ({
        title: a.title, titleEnglish: a.title_english, score: a.score, episodes: a.episodes,
        status: a.status, genres: a.genres?.map((g: any) => g.name),
        synopsis: a.synopsis?.slice(0, 200) + '...', image: a.images?.jpg?.image_url
      }))
    },
    'Search anime series. Returns score, episodes, genres, synopsis, and poster.',
    { type: 'object', properties: { query: { type: 'string', description: 'Anime title' }, limit: { type: 'number' } }, required: ['query'] },
    'entertainment'
  )

  // ── FOOD ─────────────────────────────────────────────────────────
  reg(ai, 'getMeal',
    async ({ query }) => {
      const d = query
        ? await get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`)
        : await get('https://www.themealdb.com/api/json/v1/1/random.php')
      return d.meals?.slice(0, 3).map((m: any) => ({
        name: m.strMeal, category: m.strCategory, area: m.strArea,
        instructions: m.strInstructions?.slice(0, 400) + '...',
        image: m.strMealThumb, youtube: m.strYoutube,
        ingredients: Object.keys(m).filter(k => k.startsWith('strIngredient') && m[k]).map(k => m[k]).filter(Boolean).slice(0, 8)
      }))
    },
    'Search recipes and meals. Returns ingredients, instructions, and food image.',
    { type: 'object', properties: { query: { type: 'string', description: 'Meal name or ingredient (empty for random)' } }, required: [] },
    'food'
  )

  // ── HEALTH ───────────────────────────────────────────────────────
  reg(ai, 'getDiseaseStats',
    async ({ country }) => {
      const url = country ? `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(country)}` : 'https://disease.sh/v3/covid-19/all'
      return await get(url)
    },
    'Get global or country-specific COVID-19 and disease statistics.',
    { type: 'object', properties: { country: { type: 'string', description: 'Country name (optional)' } }, required: [] },
    'health'
  )

  // ── GEOGRAPHY ────────────────────────────────────────────────────
  reg(ai, 'getCountryInfo',
    async ({ country }) => {
      return await get(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`)
    },
    'Get detailed info about any country: population, capital, currency, languages, flag.',
    { type: 'object', properties: { country: { type: 'string', description: 'Country name' } }, required: ['country'] },
    'maps'
  )

  reg(ai, 'geocodeLocation',
    async ({ query }) => {
      return await get('https://nominatim.openstreetmap.org/search', { q: query, format: 'json', limit: 3, addressdetails: 1 })
    },
    'Convert any location name to coordinates and address details.',
    { type: 'object', properties: { query: { type: 'string', description: 'Location to look up' } }, required: ['query'] },
    'maps'
  )

  // ── ART ──────────────────────────────────────────────────────────
  reg(ai, 'searchArtwork',
    async ({ query, limit = 5 }) => {
      const d = await get('https://api.artic.edu/api/v1/artworks/search', { q: query, limit, fields: 'id,title,artist_display,date_display,medium_display,image_id' })
      return d.data?.map((a: any) => ({
        title: a.title, artist: a.artist_display, date: a.date_display, medium: a.medium_display,
        image: a.image_id ? `https://www.artic.edu/iiif/2/${a.image_id}/full/600,/0/default.jpg` : null
      }))
    },
    'Search artworks from the Art Institute of Chicago. Returns artwork details and high-quality images.',
    { type: 'object', properties: { query: { type: 'string', description: 'Artist, artwork title, or movement' }, limit: { type: 'number' } }, required: ['query'] },
    'art'
  )

  // ── HISTORY ──────────────────────────────────────────────────────
  reg(ai, 'getHistoricalEvents',
    async ({ month, day }) => {
      const now = new Date()
      return await get(`https://history.muffinlabs.com/date/${month || now.getMonth() + 1}/${day || now.getDate()}`)
    },
    'Get historical events, births, and deaths for any date.',
    { type: 'object', properties: { month: { type: 'number', description: 'Month 1-12 (default today)' }, day: { type: 'number', description: 'Day 1-31 (default today)' } }, required: [] },
    'history'
  )

  // ── GAMING ───────────────────────────────────────────────────────
  reg(ai, 'getPokemon',
    async ({ name }) => {
      const d = await get(`https://pokeapi.co/api/v2/pokemon/${String(name).toLowerCase()}`)
      return {
        name: d.name, id: d.id, types: d.types?.map((t: any) => t.type.name),
        stats: d.stats?.map((s: any) => ({ name: s.stat.name, value: s.base_stat })),
        abilities: d.abilities?.map((a: any) => a.ability.name),
        sprite: d.sprites?.front_default, sprite_shiny: d.sprites?.front_shiny,
        height: d.height, weight: d.weight
      }
    },
    'Get Pokemon stats, types, abilities, and sprite image by name or Pokedex number.',
    { type: 'object', properties: { name: { type: 'string', description: 'Pokemon name or number e.g. pikachu, 25' } }, required: ['name'] },
    'gaming'
  )

  // ── SPORTS ───────────────────────────────────────────────────────
  reg(ai, 'getF1Standings',
    async ({ season = 'current' }) => {
      const d = await get(`https://ergast.com/api/f1/${season}/driverStandings.json`)
      return d.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.slice(0, 10).map((d: any) => ({
        position: d.position, driver: `${d.Driver.givenName} ${d.Driver.familyName}`,
        nationality: d.Driver.nationality, team: d.Constructors?.[0]?.name, points: d.points, wins: d.wins
      }))
    },
    'Get Formula 1 driver standings for current or any historical season.',
    { type: 'object', properties: { season: { type: 'string', description: 'Season year e.g. "2023" or "current"' } }, required: [] },
    'sports'
  )

  // ── MUSIC ────────────────────────────────────────────────────────
  reg(ai, 'searchMusic',
    async ({ query, type = 'artist' }) => {
      const d = await get(`https://musicbrainz.org/ws/2/${type}/`, { query, fmt: 'json', limit: 5 })
      return (d[`${type}s`] || []).map((item: any) => ({
        name: item.name || item.title, id: item.id,
        disambiguation: item.disambiguation, country: item.country,
        tags: item.tags?.slice(0, 5).map((t: any) => t.name)
      }))
    },
    'Search music artists, albums, or songs from MusicBrainz.',
    { type: 'object', properties: { query: { type: 'string', description: 'Artist, album, or song name' }, type: { type: 'string', description: '"artist", "release", or "recording"' } }, required: ['query'] },
    'music'
  )

  // ── LANGUAGE ─────────────────────────────────────────────────────
  reg(ai, 'defineWord',
    async ({ word }) => {
      const d = await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      if (!Array.isArray(d)) return d
      return d[0]?.meanings?.map((m: any) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions?.slice(0, 2).map((x: any) => ({ definition: x.definition, example: x.example })),
        synonyms: m.synonyms?.slice(0, 5), antonyms: m.antonyms?.slice(0, 5)
      }))
    },
    'Get dictionary definition, examples, synonyms and antonyms for any English word.',
    { type: 'object', properties: { word: { type: 'string', description: 'English word to define' } }, required: ['word'] },
    'language'
  )

  reg(ai, 'translateText',
    async ({ text, source = 'auto', target }) => {
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source, target, format: 'text' })
      })
      return res.json()
    },
    'Translate text between any languages. Supports auto-detection of source language.',
    { type: 'object', properties: { text: { type: 'string' }, source: { type: 'string', description: 'Language code or "auto"' }, target: { type: 'string', description: 'Target language code e.g. es, fr, ja, de' } }, required: ['text', 'target'] },
    'language'
  )

  // ── TECH ─────────────────────────────────────────────────────────
  reg(ai, 'getGithubUser',
    async ({ username }) => {
      const [user, repos] = await Promise.all([
        get(`https://api.github.com/users/${username}`),
        get(`https://api.github.com/users/${username}/repos?sort=stars&per_page=5`)
      ])
      return {
        name: user.name, login: user.login, bio: user.bio, location: user.location,
        followers: user.followers, public_repos: user.public_repos, avatar: user.avatar_url,
        top_repos: repos.map((r: any) => ({ name: r.name, stars: r.stargazers_count, description: r.description, language: r.language, url: r.html_url }))
      }
    },
    'Get GitHub user profile, follower count, and top starred repositories.',
    { type: 'object', properties: { username: { type: 'string', description: 'GitHub username' } }, required: ['username'] },
    'tech'
  )

  // ── SECURITY ─────────────────────────────────────────────────────
  reg(ai, 'searchVulnerabilities',
    async ({ keyword, limit = 5 }) => {
      const d = await get('https://services.nvd.nist.gov/rest/json/cves/2.0', { keywordSearch: keyword, resultsPerPage: limit })
      return d.vulnerabilities?.map((v: any) => ({
        id: v.cve.id, description: v.cve.descriptions?.[0]?.value?.slice(0, 280),
        severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity,
        score: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore, published: v.cve.published
      }))
    },
    'Search NIST National Vulnerability Database for security CVEs.',
    { type: 'object', properties: { keyword: { type: 'string', description: 'Software name or vulnerability keyword' }, limit: { type: 'number' } }, required: ['keyword'] },
    'security'
  )

  // ── QUOTES ───────────────────────────────────────────────────────
  reg(ai, 'getQuote',
    async ({ author, tag }) => {
      const params: any = {}
      if (author) params.author = author
      if (tag) params.tags = tag
      return await get('https://api.quotable.io/random', params)
    },
    'Get inspirational or famous quotes. Filter by author or topic.',
    { type: 'object', properties: { author: { type: 'string' }, tag: { type: 'string', description: 'e.g. technology, wisdom, life' } }, required: [] },
    'quotes'
  )

  // ── JOBS ─────────────────────────────────────────────────────────
  reg(ai, 'searchJobs',
    async ({ search, tags }) => {
      const params: any = {}
      if (search) params.search = search
      if (tags) params.tags = tags
      const d = await get('https://arbeitnow.com/api/job-board-api', params)
      return d.data?.slice(0, 8).map((j: any) => ({ title: j.title, company: j.company_name, location: j.location, remote: j.remote, tags: j.tags?.slice(0,4), url: j.url }))
    },
    'Search remote and European tech job listings.',
    { type: 'object', properties: { search: { type: 'string' }, tags: { type: 'string', description: 'Tech tags e.g. javascript,react' } }, required: [] },
    'jobs'
  )

  // ── ECONOMY ──────────────────────────────────────────────────────
  reg(ai, 'getWorldBankData',
    async ({ country, indicator = 'NY.GDP.MKTP.CD' }) => {
      const d = await get(`https://api.worldbank.org/v2/country/${country}/indicator/${indicator}`, { format: 'json', mrv: 5 })
      return { country: d[1]?.[0]?.country?.value, indicator, data: d[1]?.filter((x: any) => x.value).map((x: any) => ({ year: x.date, value: x.value })) }
    },
    'Get World Bank economic data for any country. GDP, population, poverty and more.',
    { type: 'object', properties: { country: { type: 'string', description: 'Country code e.g. US, CN, IN' }, indicator: { type: 'string', description: 'World Bank indicator (default: GDP)' } }, required: ['country'] },
    'economy'
  )

  // ── AI IMAGE GENERATION ──────────────────────────────────────────
  reg(ai, 'generateImage',
    async ({ prompt, width = 1024, height = 768 }) => {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`
      return { type: 'image', url, prompt }
    },
    'Generate an AI image from any text description. Returns image URL instantly.',
    { type: 'object', properties: { prompt: { type: 'string', description: 'Detailed image description' }, width: { type: 'number' }, height: { type: 'number' } }, required: ['prompt'] },
    'images'
  )

  // ── ANIMALS ──────────────────────────────────────────────────────
  reg(ai, 'getRandomDog',
    async () => await get('https://dog.ceo/api/breeds/image/random'),
    'Get a random dog image.',
    { type: 'object', properties: {}, required: [] },
    'animals'
  )

  reg(ai, 'getCatFact',
    async () => await get('https://catfact.ninja/fact'),
    'Get a random interesting cat fact.',
    { type: 'object', properties: {}, required: [] },
    'animals'
  )

  // ── JOKES ────────────────────────────────────────────────────────
  reg(ai, 'getJoke',
    async () => await get('https://official-joke-api.appspot.com/random_joke'),
    'Get a random joke.',
    { type: 'object', properties: {}, required: [] },
    'jokes'
  )

  console.log(`✅ ${ai.tools().length} tools registered`)
}

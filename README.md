# NullPoint

**Everything else is noise.**

---

One question. The entire world answers.

NullPoint is an AI agent powered by [AILink SDK](https://github.com/getailink/ailink-sdk) that gives you real-time access to 25+ of the world's best data sources through a single natural language interface. No API keys. No integrations. No infrastructure. Just ask.

---

## Start in 60 seconds

Run these commands from the repository root:

```bash
# 1. Install
npm install

# 2. Configure
cp NullPoint/.env.example NullPoint/.env
# → Add your free Groq key from https://console.groq.com

# 3. Run locally
npm run dev

# 4. Open
# Browser → http://localhost:3001
# Terminal → npm run cli
```

That's it.

---

## What you can ask

```
What's the weather in Tokyo this week?
Bitcoin and Ethereum prices right now
Latest space news from NASA
Search anime: Fullmetal Alchemist
Books by Fyodor Dostoevsky
Monet paintings from the Art Institute
Latest CVE vulnerabilities in Chrome
Recent AI research papers on arXiv
Formula 1 standings 2024
GDP of Japan last 5 years
Generate image: cyberpunk city in the rain
Who is @torvalds on GitHub?
Define: ephemeral
Translate "hello world" to Japanese
Tell me a joke
```

---

## API

```bash
# Query (full response)
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Bitcoin price"}'

# Streaming (SSE)
curl -X POST http://localhost:3001/api/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "Latest space news"}'
```

## Production commands

```bash
npm run typecheck
npm run build
npm start
```

`npm start` runs the compiled server from `NullPoint/dist`.

---

## Data sources

| Category | API |
|---|---|
| Weather | Open-Meteo |
| Knowledge | Wikipedia |
| News | HackerNews + Spaceflight News API |
| Crypto | CoinGecko |
| Currency | Frankfurter (ECB) |
| Space | NASA APOD |
| Science | arXiv |
| Books | Open Library |
| TV Shows | TVMaze |
| Anime | Jikan (MyAnimeList) |
| Food | TheMealDB |
| Health | Disease.sh |
| Geography | Nominatim + REST Countries |
| Art | Art Institute of Chicago |
| History | Muffinlabs |
| Gaming | PokéAPI |
| Sports | Ergast F1 |
| Music | MusicBrainz |
| Dictionary | Free Dictionary API |
| Translation | LibreTranslate |
| GitHub | GitHub API |
| Security | NIST NVD |
| Quotes | Quotable |
| Jobs | Arbeitnow |
| Economy | World Bank |
| AI Images | Pollinations AI (free, no key) |
| Animals | Dog CEO + CatFact |
| Jokes | Official Joke API |

All free. All no-auth.

---

## Switch AI provider anytime

```env
# .env — one line change, nothing else touches
AI_PROVIDER=groq       # free (default)
AI_PROVIDER=openai     # gpt-4o-mini
AI_PROVIDER=anthropic  # claude
```

---

## Built with

- [AILink SDK](https://github.com/getailink/ailink-sdk) — the engine that makes this possible
- [Groq](https://groq.com) — free, fast LLM inference
- 28 free public APIs — the world

---

*NullPoint. Everything else is noise.*

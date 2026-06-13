/**
 * NullPoint — Agent Core
 * The brain. Routes → RAG → AILink → Stream.
 */

import { AILink } from '@ailink/sdk'
import { registerTools, lastResults, toolResultsStorage } from '../tools/registry'
import { routeQuery } from '../router/semantic'
import { recall, clearMemory } from '../rag/memory'
import * as dotenv from 'dotenv'
dotenv.config()

export interface NullPointResponse {
  text: string
  toolsUsed: string[]
  richContent: RichItem[]
  groups: string[]
  duration: number
}

export interface RichItem {
  type: 'image' | 'gallery' | 'card' | 'list' | 'chart'
  toolName: string
  data: any
}

// Maps tool name → rich content type
const RICH_MAP: Record<string, RichItem['type']> = {
  generateImage:         'image',
  getNASAImageOfDay:     'image',
  getRandomDog:          'image',
  getPokemon:            'image',
  getWikipediaSummary:   'image',
  searchBooks:           'gallery',
  searchAnime:           'gallery',
  searchShows:           'gallery',
  getMeal:               'gallery',
  searchArtwork:         'gallery',
  getWeather:            'card',
  getCryptoPrice:        'card',
  getCurrencyRates:      'card',
  getCountryInfo:        'card',
  getGithubUser:         'card',
  getDiseaseStats:       'card',
  getTopNews:            'list',
  getSpaceNews:          'list',
  searchJobs:            'list',
  searchResearchPapers:  'list',
  searchVulnerabilities: 'list',
  getF1Standings:        'list',
  getHistoricalEvents:   'list',
  searchMusic:           'list',
  searchWikipedia:       'list',
  getWorldBankData:      'chart',
}

export class NullPointAgent {
  private ai: AILink
  private session: any
  private sessionId: string

  constructor() {
    const provider = process.env.AI_PROVIDER || 'groq'
    const key = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY
    if (!key) {
      throw new Error(
        `\n❌  API Key missing for provider "${provider}".\n` +
        `    Please set ${provider === 'openai' ? 'OPENAI_API_KEY' : 'GROQ_API_KEY'} in your .env file.\n`
      )
    }

    this.ai = new AILink({
      provider: provider as any,
      providerKey: key,
      model: process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile'),
      maxIterations: 5,
    })

    registerTools(this.ai)

    this.sessionId = `np_${Date.now()}`
    this.session = this.ai.createSession(this.sessionId, 3)  // Reduced to 3 to prevent token bloat on Groq free tier

    console.log(`\n⚡ NullPoint ready`)
    console.log(`   Provider : ${provider}`)
    console.log(`   Model    : ${process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile')}`)
    console.log(`   Tools    : ${this.ai.tools().length}\n`)
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  async query(input: string): Promise<NullPointResponse> {
    const start = Date.now()

    // 1. Route — pick relevant groups
    const groups = routeQuery(input)
    console.log(`🧭  [${groups.join(', ')}]  "${input.slice(0, 60)}"`)

    if (groups.includes('meta')) {
      return {
        text: "Here's everything I can do: Weather forecasts, Crypto & currency prices, Wikipedia knowledge, Top news & space news, Anime & TV shows, Books, Recipes & food, Art & paintings, Research papers, GitHub profiles, CVE vulnerabilities, F1 standings, Pokemon, Music search, Jobs, World Bank data, AI image generation, Jokes, Quotes, Disease stats, Country info, Historical events, Dictionary & translation. Just ask naturally.",
        toolsUsed: [],
        richContent: [],
        groups: ['meta'],
        duration: 0
      }
    }

    // 2. RAG — build context from session memory
    const ctx = recall(input)

    // 3. Full prompt with RAG context
    const prompt = ctx ? `${input}\n${ctx}` : input
    const tokens = this.estimateTokens(prompt)
    console.log(`   Prompt size: ${prompt.length} chars ≈ ${tokens} tokens`)

    // 4. Clear captured results before this run (legacy fallback, thread-unsafe but kept)
    for (const k of Object.keys(lastResults)) delete lastResults[k]

    // Initialize local store for this request context
    const requestStore: Record<string, any> = {}

    // 5. Run through AILink with group-filtered tools
    try {
      const result = await toolResultsStorage.run(requestStore, async () => {
        return await this.session.run(prompt, { groups })
      })

      const text: string = result.response || ''
      const toolsUsed: string[] = result.toolsCalled || []

      console.log(`✅  ${toolsUsed.join(' · ') || 'no tools'} · ${Date.now() - start}ms`)

      // 6. Build rich content from captured tool results in the request store
      const richContent: RichItem[] = []
      for (const toolName of toolsUsed) {
        const richType = RICH_MAP[toolName]
        const toolData = requestStore[toolName]
        if (richType && toolData) {
          if (toolName === 'getWikipediaSummary' && toolData.thumbnail) {
            richContent.push({
              type: 'image',
              toolName,
              data: { url: toolData.thumbnail, title: toolData.title }
            })
            continue
          }

          richContent.push({ type: richType, toolName, data: toolData })
        }
      }

      return { text, toolsUsed, richContent, groups, duration: Date.now() - start }
    } catch (err: any) {
      console.error(`❌  Error: ${err.message}`)
      console.error(`   Prompt tokens: ${tokens}`)
      throw err
    }
  }

  reset(): void {
    this.sessionId = `np_${Date.now()}`
    this.session = this.ai.createSession(this.sessionId, 3)
    clearMemory()
    console.log('🔄  Session reset')
  }

  toolCount(): number { return this.ai.tools().length }
}

// Singleton
let _agent: NullPointAgent | null = null
export function getAgent(): NullPointAgent {
  if (!_agent) _agent = new NullPointAgent()
  return _agent
}

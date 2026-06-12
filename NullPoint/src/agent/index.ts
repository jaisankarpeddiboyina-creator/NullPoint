/**
 * NullPoint — Agent Core
 * The brain. Routes → RAG → AILink → Stream.
 */

import { AILink } from '@ailink/sdk'
import { registerTools, lastResults } from '../tools/registry'
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
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        '\n❌  GROQ_API_KEY missing.\n' +
        '    1. Copy .env.example → .env\n' +
        '    2. Add your key from https://console.groq.com (free)\n'
      )
    }

    this.ai = new AILink({
      provider: (process.env.AI_PROVIDER as any) || 'groq',
      providerKey: process.env.GROQ_API_KEY,
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      maxIterations: 5,
    })

    registerTools(this.ai)

    this.sessionId = `np_${Date.now()}`
    this.session = this.ai.createSession(this.sessionId, 3)  // Reduced to 3 to prevent token bloat on Groq free tier

    console.log(`\n⚡ NullPoint ready`)
    console.log(`   Provider : ${process.env.AI_PROVIDER || 'groq'}`)
    console.log(`   Model    : ${process.env.AI_MODEL || 'llama-3.3-70b-versatile'}`)
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

    // 2. RAG — build context from session memory
    const ctx = recall(input)

    // 3. Full prompt with RAG context
    const prompt = ctx ? `${input}\n${ctx}` : input
    const tokens = this.estimateTokens(prompt)
    console.log(`   Prompt size: ${prompt.length} chars ≈ ${tokens} tokens`)

    // 4. Clear captured results before this run
    for (const k of Object.keys(lastResults)) delete lastResults[k]

    // 5. Run through AILink with group-filtered tools
    try {
      const result = await this.session.run(prompt, { groups })

      const text: string = result.response || ''
      const toolsUsed: string[] = result.toolsCalled || []

      console.log(`✅  ${toolsUsed.join(' · ') || 'no tools'} · ${Date.now() - start}ms`)

      // 6. Build rich content from captured tool results
      const richContent: RichItem[] = []
      for (const toolName of toolsUsed) {
        const richType = RICH_MAP[toolName]
        if (richType && lastResults[toolName]) {
          richContent.push({ type: richType, toolName, data: lastResults[toolName] })
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

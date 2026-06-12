/**
 * NullPoint — API Server
 * REST + SSE streaming. Serves the UI. Handles API keys.
 *
 * Endpoints:
 *   GET  /                  → serves the web UI
 *   GET  /api/health        → health check
 *   POST /api/query         → full response (JSON)
 *   POST /api/stream        → streaming response (SSE)
 *   POST /api/reset         → reset session
 *   GET  /api/tools         → list all tools
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import crypto from 'crypto'
import * as dotenv from 'dotenv'
import { getAgent } from '../agent/index'
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const requestCounts = new Map<string, {count: number, reset: number}>()
function simpleRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.headers['cf-connecting-ip'] as string || req.ip || 'unknown'
  const now = Date.now()
  const record = requestCounts.get(ip)
  if (!record || now > record.reset) {
    requestCounts.set(ip, { count: 1, reset: now + 60000 })
    return next()
  }
  if (record.count >= 30) return res.status(429).json({ error: 'Too many requests, slow down.' })
  record.count++
  next()
}
app.use('/api/', simpleRateLimit)

// ── Serve the UI ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../ui')))

// ── API Key auth ───────────────────────────────────────────────────
const AUTH = process.env.NULLPOINT_AUTH !== 'false'
const keys = new Set<string>((process.env.NULLPOINT_API_KEYS || '').split(',').filter(Boolean))

if (AUTH && keys.size === 0) {
  const k = `np_${crypto.randomBytes(16).toString('hex')}`
  keys.add(k)
  console.log(`\n🔑  Your NullPoint API Key:\n    ${k}\n`)
}

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!AUTH) return next()
  const k = (req.headers['x-nullpoint-key'] as string) || req.headers['authorization']?.replace('Bearer ', '')
  if (!k || !keys.has(k)) return res.status(401).json({ error: 'Invalid or missing API key. Use X-NullPoint-Key header.' })
  next()
}

// ── Routes ─────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => {
  res.json({ status: 'alive', name: 'NullPoint', tagline: 'Everything else is noise.' })
})

app.get('/api/tools', auth, (_, res) => {
  const agent = getAgent()
  res.json({ count: agent.toolCount(), tools: agent['ai'].tools() })
})

// Full JSON response
app.post('/api/query', auth, async (req, res) => {
  const { query, reset } = req.body
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' })
  try {
    const agent = getAgent()
    if (reset) agent.reset()
    const response = await agent.query(query)
    res.json({ success: true, response })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// SSE Streaming response
// Flow: AILink runs (gets data from tools) → we stream the text back word by word
// This gives the "streaming" feel without needing native SDK streaming
app.post('/api/stream', auth, async (req, res) => {
  const { query, reset } = req.body
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const agent = getAgent()
    if (reset) agent.reset()

    // Tell UI we are thinking
    send('status', { status: 'thinking' })

    // Run AILink — this does all tool calling
    const response = await agent.query(query)

    // Send tools used so UI can show them
    if (response.toolsUsed.length > 0) {
      send('tools', { tools: response.toolsUsed })
    }

    // Stream the text response word by word
    const words = response.text.split(' ')
    for (let i = 0; i < words.length; i++) {
      const token = (i === 0 ? '' : ' ') + words[i]
      send('token', { token })
      // Small delay to create streaming effect
      await new Promise(r => setTimeout(r, 18))
    }

    // Send rich content
    if (response.richContent.length > 0) {
      send('rich', { content: response.richContent })
    }

    // Done
    send('done', { toolsUsed: response.toolsUsed, duration: response.duration })

  } catch (e: any) {
    send('error', { message: e.message })
  }

  res.end()
})

// Reset session
app.post('/api/reset', auth, (_, res) => {
  getAgent().reset()
  res.json({ success: true })
})

// ── Start ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001')

export function startServer() {
  try { getAgent() } catch (e: any) { console.error(e.message); process.exit(1) }

  const server = app.listen(PORT, () => {
    console.log(`\n🌐  Web UI  →  http://localhost:${PORT}`)
    console.log(`🔌  API     →  http://localhost:${PORT}/api/health`)
    console.log(`🔑  Auth    →  ${AUTH ? 'enabled' : 'disabled (dev mode)'}\n`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${PORT} is already in use. Set PORT to another value or stop the existing server.\n`)
    } else {
      console.error('\n❌  Server failed to start:', error.message, '\n')
    }
    process.exit(1)
  })

  return server
}

if (process.env.NODE_ENV !== 'production') {
  startServer()
}

export default app

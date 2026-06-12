/**
 * NullPoint — RAG Memory
 * Stores what we've learned this session.
 * Injects max 2 relevant chunks — never bloats the prompt.
 */

interface Chunk { query: string; text: string; ts: number; keys: string[] }

const store: Chunk[] = []
const MAX = 40

function keywords(text: string): string[] {
  const stop = new Set(['the','a','an','is','are','was','were','be','have','has','do','does','to','of','in','for','on','with','at','by','from','and','but','or','not'])
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w)).slice(0,25)
}

function relevance(qkeys: string[], chunk: Chunk): number {
  const ck = new Set(chunk.keys)
  let s = qkeys.reduce((acc, k) => acc + (ck.has(k) ? 2 : 0), 0)
  const age = (Date.now() - chunk.ts) / 60000
  return s + (age < 5 ? 3 : age < 15 ? 1 : 0)
}

export function remember(query: string, data: any): void {
  const text = (typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 800)
  store.push({ query, text, ts: Date.now(), keys: keywords(query + ' ' + text) })
  if (store.length > MAX) store.shift()
}

export function recall(query: string): string {
  if (!store.length) return ''
  const qkeys = keywords(query)
  const top = store
    .map(c => ({ c, s: relevance(qkeys, c) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
  if (!top.length) return ''
  return '\n\n[Session context]\n' + top.map(x => `Q: ${x.c.query}\n${x.c.text}`).join('\n\n') + '\n'
}

export function clearMemory(): void { store.length = 0 }

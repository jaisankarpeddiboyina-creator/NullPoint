#!/usr/bin/env ts-node
/**
 * NullPoint — CLI
 * Ask anything. Get everything. In your terminal.
 *
 * Usage:
 *   npm run cli
 *   npm run cli -- "What is the weather in Tokyo?"
 */

import * as readline from 'readline'
import * as dotenv from 'dotenv'
import { getAgent } from '../agent/index'
import { clearMemory } from '../rag/memory'
dotenv.config()

const C = {
  reset: '\x1b[0m',   bold: '\x1b[1m',    dim: '\x1b[2m',
  cyan:  '\x1b[36m',  green: '\x1b[32m',  red: '\x1b[31m',
  white: '\x1b[37m',  gray: '\x1b[90m',   yellow: '\x1b[33m',
}

const p  = (t: string) => process.stdout.write(t)
const pl = (t = '')   => console.log(t)

function banner() {
  pl()
  pl(`${C.bold}${C.white}  ███╗   ██╗██╗   ██╗██╗     ██╗${C.reset}`)
  pl(`${C.bold}${C.white}  ████╗  ██║██║   ██║██║     ██║${C.reset}`)
  pl(`${C.bold}${C.cyan}  ██╔██╗ ██║██║   ██║██║     ██║${C.reset}`)
  pl(`${C.bold}${C.cyan}  ██║╚██╗██║██║   ██║██║     ██║${C.reset}`)
  pl(`${C.bold}${C.white}  ██║ ╚████║╚██████╔╝███████╗███████╗${C.reset}`)
  pl(`${C.bold}${C.white}  ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝  ${C.dim}POINT${C.reset}`)
  pl()
  pl(`${C.gray}  Everything else is noise.${C.reset}`)
  pl()
  pl(`${C.dim}  Commands: /reset  /tools  /exit${C.reset}`)
  pl()
}

async function runQuery(query: string) {
  pl()
  p(`${C.bold}${C.cyan}NullPoint${C.reset} ${C.gray}›${C.reset} `)
  p(`${C.dim}thinking...${C.reset}`)

  try {
    const agent = getAgent()
    const res = await agent.query(query)

    // Clear the "thinking..." and print the response
    process.stdout.write('\r' + ' '.repeat(40) + '\r')
    p(`${C.bold}${C.cyan}NullPoint${C.reset} ${C.gray}›${C.reset} `)
    pl(res.text)
    pl()

    // Show rich content URLs in CLI
    for (const rc of res.richContent) {
      if (rc.type === 'image') {
        const url = rc.data?.url || rc.data?.message
        if (url) pl(`${C.dim}  📸 ${url}${C.reset}`)
      }
    }

    // Metadata
    if (res.toolsUsed.length > 0) {
      pl(`${C.gray}  ⚡ ${res.toolsUsed.join(' · ')} · ${res.duration}ms${C.reset}`)
    }
    pl()

  } catch (e: any) {
    process.stdout.write('\r' + ' '.repeat(40) + '\r')
    pl(`${C.red}  Error: ${e.message}${C.reset}`)
    pl()
  }
}

async function repl() {
  banner()

  const agent = getAgent()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const prompt = () => p(`${C.bold}${C.white}You${C.reset} ${C.gray}›${C.reset} `)

  rl.on('line', async (line) => {
    const input = line.trim()
    if (!input) return prompt()

    if (input === '/exit' || input === '/quit') {
      pl(`\n${C.dim}  Goodbye.${C.reset}\n`)
      process.exit(0)
    }
    if (input === '/reset') {
      agent.reset()
      clearMemory()
      pl(`\n${C.green}  ✓ Session cleared${C.reset}\n`)
      return prompt()
    }
    if (input === '/tools') {
      pl(`\n${C.cyan}  ${agent.toolCount()} tools registered${C.reset}\n`)
      return prompt()
    }

    await runQuery(input)
    prompt()
  })

  rl.on('close', () => { pl(`\n${C.dim}  Goodbye.${C.reset}\n`); process.exit(0) })

  prompt()
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (args.length > 0) {
    await runQuery(args.join(' '))
    process.exit(0)
  }
  await repl()
}

main().catch(e => { console.error(e.message); process.exit(1) })

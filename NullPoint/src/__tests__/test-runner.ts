import { routeQuery } from '../router/semantic'
import { remember, recall, clearMemory } from '../rag/memory'

let failures = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌  FAIL: ${message}`)
    failures++
  } else {
    console.log(`✅  PASS: ${message}`)
  }
}

function runTests() {
  console.log('🧪 Running NullPoint Core Unit Tests...\n')

  // --- 1. Testing Semantic Router ---
  console.log('--- Testing Semantic Router ---')
  const weatherRoute = routeQuery('What is the weather in Tokyo?')
  assert(weatherRoute.includes('weather'), 'Weather query routes to weather group')

  const financeRoute = routeQuery('Show me the price of Bitcoin')
  assert(financeRoute.includes('finance'), 'Bitcoin query routes to finance group')

  const metaRoute = routeQuery('help capabilities features')
  assert(metaRoute.length === 1 && metaRoute[0] === 'meta', 'Help query routes to meta group')

  const defaultRoute = routeQuery('xyz abc')
  assert(defaultRoute.includes('knowledge') && defaultRoute.includes('news'), 'Default query routes to knowledge and news')

  // --- 2. Testing Session RAG Memory ---
  console.log('\n--- Testing Session RAG Memory ---')
  clearMemory()
  assert(recall('weather') === '', 'Recall returns empty on clean memory')

  remember('weather in Tokyo', { temp: '22C', condition: 'Sunny' })
  remember('bitcoin price', { usd: 67000 })

  const recalledWeather = recall('What is the weather like?')
  assert(recalledWeather.includes('[Session context]'), 'Recall returns session context header')
  assert(recalledWeather.includes('Tokyo') && recalledWeather.includes('Sunny'), 'Recall finds correct weather query context')

  const recalledBitcoin = recall('How much is bitcoin?')
  assert(recalledBitcoin.includes('67000'), 'Recall finds correct bitcoin price context')

  clearMemory()
  assert(recall('bitcoin') === '', 'Recall returns empty after clearing memory')

  console.log('\n--- Summary ---')
  if (failures > 0) {
    console.error(`❌  Tests completed with ${failures} failure(s).`)
    process.exit(1)
  } else {
    console.log('🎉  All tests passed successfully!')
    process.exit(0)
  }
}

runTests()

/**
 * Test if AILink session creation works
 */
import { AILink } from '@ailink/sdk'
import * as dotenv from 'dotenv'
dotenv.config()

async function testAILink() {
  console.log('Testing AILink with Groq...')

  try {
    const ai = new AILink({
      provider: 'groq',
      providerKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      maxIterations: 5,
    })

    console.log('✅ AILink initialized')

    const session = ai.createSession('test-session', 3)
    console.log('✅ Session created')

    const result = await session.run('Say hello')
    console.log('✅ Query succeeded!')
    console.log('Response:', result.response)
  } catch (err: any) {
    console.error('❌ AILink Error:', err.message)
    console.error('Full error:', err)
  }
}

testAILink()

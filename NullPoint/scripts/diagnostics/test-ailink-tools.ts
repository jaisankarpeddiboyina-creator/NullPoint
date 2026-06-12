/**
 * Test if tool registration breaks AILink
 */
import { AILink } from '@ailink/sdk'
import * as dotenv from 'dotenv'
dotenv.config()

async function testAILinkWithTools() {
  console.log('Testing AILink with Groq + Tools...')

  try {
    const ai = new AILink({
      provider: 'groq',
      providerKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      maxIterations: 5,
    })

    console.log('✅ AILink initialized')

    // Register a simple test tool
    ai.register('testTool', async (args: any) => {
      console.log('Tool called with:', args)
      return 'Tool result'
    }, {
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      group: 'test'
    })

    console.log('✅ Tool registered')

    const session = ai.createSession('test-session', 3)
    console.log('✅ Session created')

    const result = await session.run('Use the test tool with input hello')
    console.log('✅ Query succeeded!')
    console.log('Response:', result.response)
    console.log('Tools called:', result.toolsCalled)
  } catch (err: any) {
    console.error('❌ AILink Error:', err.message)
    console.error('Stack:', err.stack)
  }
}

testAILinkWithTools()

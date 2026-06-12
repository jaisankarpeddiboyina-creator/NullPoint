/**
 * Quick test to verify Groq API key works
 */
import * as dotenv from 'dotenv'
dotenv.config()

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY
  console.log(`Testing Groq API key: ${apiKey?.substring(0, 10)}...`)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Say hello' }
        ],
        max_tokens: 100,
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`❌ Groq API Error (${response.status}):`)
      console.error(JSON.stringify(data, null, 2))
      return
    }

    console.log('✅ Groq API works!')
    console.log('Response:', data.choices?.[0]?.message?.content)
  } catch (err: any) {
    console.error('❌ Network or parsing error:', err.message)
  }
}

testGroq()

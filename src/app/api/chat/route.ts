import { Groq } from 'groq-sdk'
import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, model, conversationId } = await req.json()
    
    // In a real app, you'd verify the conversation belongs to the user here
    // but for the MVP streaming response:
    
    const response = await groq.chat.completions.create({
      messages,
      model: model || "qwen-qwq-32b", // Using the qwen/qwen3-32b equivalent in Groq SDK
      stream: true,
    })

    // Create a ReadableStream to stream the response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(new TextEncoder().encode(content))
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })

  } catch (error: any) {
    console.error('Chat Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

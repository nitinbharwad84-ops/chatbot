'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Message, Conversation } from '@/types/database'
import MessageBubble from './message-bubble'
import ChatInput from './chat-input'
import { Bot } from 'lucide-react'

export default function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatId) fetchMessages()
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (content: string, model: string, isRegenerate = false) => {
    if (!chatId) return

    let currentMessages = [...messages]

    if (!isRegenerate) {
      // 1. Save User Message
      const { data: userMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: chatId,
          role: 'user',
          content: content
        })
        .select()
        .single()

      if (userMsg) {
        currentMessages = [...currentMessages, userMsg]
        setMessages(currentMessages)
      }
    }

    // 2. Stream AI Response
    setLoading(true)
    setStreamingContent('')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          model: model,
          conversationId: chatId
        })
      })

      if (!response.body) return

      const reader = response.body.getReader()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        fullContent += chunk
        setStreamingContent(fullContent)
      }

      // 3. Save AI Message to DB
      const { data: aiMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: chatId,
          role: 'assistant',
          content: fullContent
        })
        .select()
        .single()

      if (aiMsg) setMessages(prev => [...prev, aiMsg])
      setStreamingContent('')

      // 4. Update Conversation Title (if it's the first message)
      if (!isRegenerate && messages.length === 0) {
        await supabase
          .from('conversations')
          .update({ title: content.slice(0, 30) + (content.length > 30 ? '...' : '') })
          .eq('id', chatId)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const regenerateMessage = async (index: number) => {
    // Find the last user message before this index
    const lastUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    // Delete current assistant message if it exists at this index
    if (messages[index]?.role === 'assistant') {
      await deleteMessage(messages[index].id)
    }

    // Set messages to everything before the deleted assistant message
    const previousMessages = messages.slice(0, index)
    setMessages(previousMessages)

    // Trigger send with the last user content
    // We assume the default model for now or we could store it in the conversation
    handleSend(lastUserMsg.content, 'qwen-qwq-32b', true)
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pb-40 scrollbar-hide">
        {messages.length === 0 && !streamingContent && (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-[#0a2257] flex items-center justify-center text-[#c6c6c7] mb-4">
              <Bot size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">How can I help you today?</h2>
            <p className="text-[#96a9e6] max-w-sm">Select a model and start chatting with the world's fastest AI.</p>
          </div>
        )}
        
        {messages.map((m, index) => (
          <div key={m.id} className="group">
            <MessageBubble 
              message={m} 
              onDelete={deleteMessage} 
              onRegenerate={m.role === 'assistant' ? () => regenerateMessage(index) : undefined}
            />
          </div>
        ))}

        {streamingContent && (
          <div className="bg-[#0a1839]/30 flex w-full gap-4 p-6">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c6c6c7]/30 bg-[#c6c6c7] text-[#3f4041]">
              <Bot size={18} />
            </div>
            <div className="prose prose-invert max-w-none text-[#dfe4ff]">
              {streamingContent}
              <span className="inline-block h-4 w-1 animate-pulse bg-[#c6c6c7] ml-1" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={(content, model) => handleSend(content, model)} disabled={loading} />
    </div>
  )
}

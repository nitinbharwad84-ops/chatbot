'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Message } from '@/types/database'
import MessageBubble from './message-bubble'
import ChatInput from './chat-input'
import { Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3-32b')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), [])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!chatId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }, [chatId, supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleSend = async (content: string, model: string, isRegenerate = false, overrideMessages?: Message[]) => {
    if (!chatId) return
    setLoading(true)
    setSelectedModel(model)

    let currentMessages = overrideMessages || [...messages]

    if (!isRegenerate) {
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

      // Update conversation title if this is the first message
      if (!isRegenerate && currentMessages.length === 1) {
        await supabase
          .from('conversations')
          .update({ 
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            updated_at: new Date().toISOString()
          })
          .eq('id', chatId)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const regenerateMessage = async (index: number) => {
    const lastUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    if (messages[index]?.role === 'assistant') {
      await deleteMessage(messages[index].id)
    }

    const previousMessages = messages.slice(0, index)
    setMessages(previousMessages)
    
    handleSend(lastUserMsg.content, selectedModel, true, previousMessages)
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // Helper to clean streaming content for display (removes <think> tag and its content even if partial)
  const displayStreamingContent = streamingContent
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '')
    .trim()

  return (
    <div className="flex h-full flex-col">
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
          <div className="bg-[#0a1839]/20 flex w-full gap-4 p-6 border-b border-[#32457c]/10">
             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c6c6c7]/30 bg-[#c6c6c7] text-[#3f4041]">
              <Bot size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="prose prose-invert max-w-none text-[#dfe4ff]">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    think: ({children}) => <>{children}</>
                  }}
                >
                  {displayStreamingContent || '...'}
                </ReactMarkdown>
                <span className="inline-block h-4 w-1 animate-pulse bg-[#c6c6c7] ml-1 align-middle" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-px" />
      </div>

      <ChatInput 
        onSend={(content, model) => handleSend(content, model)} 
        disabled={loading} 
        onModelChange={setSelectedModel}
      />
    </div>
  )
}

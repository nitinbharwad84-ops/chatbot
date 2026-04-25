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
import { useRouter } from 'next/navigation'

export default function ChatWindow({ chatId: initialChatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3-32b')
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Internal state for the actual chatId being used
  const [currentChatId, setCurrentChatId] = useState(initialChatId)

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), [])

  // Sync internal state with props
  useEffect(() => {
    setCurrentChatId(initialChatId)
    if (initialChatId === 'new') {
      setMessages([])
    }
  }, [initialChatId])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!currentChatId || currentChatId === 'new') return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', currentChatId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }, [currentChatId, supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleSend = async (content: string, model: string, isRegenerate = false, overrideMessages?: Message[]) => {
    setLoading(true)
    setSelectedModel(model)

    let activeChatId = currentChatId
    let currentMessages = overrideMessages || [...messages]

    try {
      // 1. If this is a new chat, create it first
      if (activeChatId === 'new') {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ 
            user_id: user.id, 
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            model_id: model
          })
          .select()
          .single()

        if (convError || !newConv) throw convError || new Error('Failed to create conversation')
        
        activeChatId = newConv.id
        setCurrentChatId(activeChatId)
        // We will redirect at the end to avoid component unmount/remount mid-stream
      }

      // 2. Save User Message
      if (!isRegenerate) {
        const { data: userMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: activeChatId,
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

      // 3. Get AI Stream
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          model: model,
          conversationId: activeChatId
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

      // 4. Save AI Message
      const { data: aiMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeChatId,
          role: 'assistant',
          content: fullContent
        })
        .select()
        .single()

      if (aiMsg) setMessages(prev => [...prev, aiMsg])
      setStreamingContent('')

      // 5. Update title if not new (it was already set for 'new' chats)
      if (!isRegenerate && initialChatId !== 'new' && currentMessages.length === 1) {
        await supabase
          .from('conversations')
          .update({ 
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            updated_at: new Date().toISOString()
          })
          .eq('id', activeChatId)
      }

      // Dispatch event for sidebar
      window.dispatchEvent(new CustomEvent('conversationUpdated'))

      // 6. Finally, if it was a new chat, update URL
      if (initialChatId === 'new') {
        router.replace(`/chat/${activeChatId}`)
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

  // Helper to clean streaming content for display
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

'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Message } from '@/types/database'
import MessageBubble from './message-bubble'
import ChatInput from './chat-input'
import { Bot, LogIn, UserPlus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChatWindow({ chatId: initialChatId }: { chatId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3-32b')
  const [user, setUser] = useState<any>(null)
  const [guestMessageCount, setGuestMessageCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    // Initialize guest count from sessionStorage
    const savedCount = sessionStorage.getItem('guest_msg_count')
    if (savedCount) setGuestMessageCount(parseInt(savedCount))
  }, [supabase])

  useEffect(() => {
    setCurrentChatId(initialChatId)
    if (initialChatId === 'new') {
      setMessages([])
    }
  }, [initialChatId])

  const [currentChatId, setCurrentChatId] = useState(initialChatId)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!currentChatId || currentChatId === 'new' || !user) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', currentChatId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }, [currentChatId, supabase, user])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleSend = async (content: string, model: string, isRegenerate = false, overrideMessages?: Message[]) => {
    if (!user && guestMessageCount >= 4) {
      return // Limit reached
    }

    setLoading(true)
    setSelectedModel(model)

    let activeChatId = currentChatId
    let currentMessages = overrideMessages || [...messages]

    try {
      // 1. GUEST MODE HANDLING
      if (!user) {
        if (!isRegenerate) {
          const newUserMsg = {
            id: Math.random().toString(),
            role: 'user',
            content: content,
            created_at: new Date().toISOString()
          } as any
          currentMessages = [...currentMessages, newUserMsg]
          setMessages(currentMessages)
          
          const newCount = guestMessageCount + 1
          setGuestMessageCount(newCount)
          sessionStorage.setItem('guest_msg_count', newCount.toString())
        }

        // Get AI Stream
        const response = await fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
            model: model,
            conversationId: 'guest'
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

        const newAiMsg = {
          id: Math.random().toString(),
          role: 'assistant',
          content: fullContent,
          created_at: new Date().toISOString()
        } as any
        setMessages(prev => [...prev, newAiMsg])
        setStreamingContent('')
        return
      }

      // 2. AUTHENTICATED MODE (Normal Logic)
      if (activeChatId === 'new') {
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
      }

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

      if (!isRegenerate && initialChatId !== 'new' && currentMessages.length === 1) {
        await supabase
          .from('conversations')
          .update({ 
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
            updated_at: new Date().toISOString()
          })
          .eq('id', activeChatId)
      }

      window.dispatchEvent(new CustomEvent('conversationUpdated'))

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
    if (!user) {
      const lastUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user')
      if (!lastUserMsg) return
      const previousMessages = messages.slice(0, index)
      setMessages(previousMessages)
      handleSend(lastUserMsg.content, selectedModel, true, previousMessages)
      return
    }
    
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
    if (!user) {
      setMessages(prev => prev.filter(m => m.id !== id))
      return
    }
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

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
            {!user && (
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                Guest Mode: {4 - guestMessageCount} messages remaining.
              </div>
            )}
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

        {!user && guestMessageCount >= 4 && (
          <div className="m-6 p-8 rounded-3xl bg-[#0a1839]/40 border border-[#32457c]/30 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#32457c] to-[#0a2257] flex items-center justify-center mx-auto text-white shadow-xl">
              <UserPlus size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Free limit reached!</h3>
              <p className="text-sm text-[#96a9e6]">You've used all 4 free messages. Sign in to continue chatting and save your history.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/login" className="px-6 py-2.5 rounded-xl bg-white text-[#070d1f] text-sm font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                <LogIn size={18} />
                Sign In
              </Link>
              <Link href="/signup" className="px-6 py-2.5 rounded-xl border border-[#32457c]/50 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#32457c]/20 transition-colors">
                <UserPlus size={18} />
                Create Account
              </Link>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="h-px" />
      </div>

      <ChatInput 
        onSend={(content, model) => handleSend(content, model)} 
        disabled={loading || (!user && guestMessageCount >= 4)} 
        onModelChange={setSelectedModel}
      />
    </div>
  )
}

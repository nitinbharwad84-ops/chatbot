'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Bot } from 'lucide-react'

export default function ChatRootPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const initNewChat = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Create a fresh conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select()
        .single()

      if (data) {
        router.replace(`/chat/${data.id}`)
      }
    }

    initNewChat()
  }, [router, supabase])

  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-[#070d1f]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-16 w-16 rounded-2xl bg-[#0a2257] flex items-center justify-center text-[#c6c6c7] mb-4">
          <Bot size={32} />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Initializing new chat...</h2>
        <p className="text-[#96a9e6] text-sm">Getting things ready for you.</p>
      </div>
    </div>
  )
}

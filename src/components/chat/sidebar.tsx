'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Plus, MessageSquare, Trash2, LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Conversation } from '@/types/database'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Memoize supabase client to prevent useEffect dependency size errors and infinite loops
  const supabase = useMemo(() => createClient(), [])
  
  const router = useRouter()
  const params = useParams()
  const chatId = params.chatId as string

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
    
    if (data) setConversations(data)
  }

  useEffect(() => {
    fetchConversations()

    // Subscribe to changes in conversations table
    const channel = supabase
      .channel('sidebar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('Conversation change detected:', payload)
          fetchConversations()
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime status:', status)
      })

    // Listen for manual update events
    const handleUpdate = () => {
      console.log('Manual update event received')
      fetchConversations()
    }
    window.addEventListener('conversationUpdated', handleUpdate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('conversationUpdated', handleUpdate)
    }
  }, [supabase])

  const createNewChat = () => {
    router.push('/chat')
    setIsMobileOpen(false)
  }

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this chat?')) return

    const { error } = await supabase.from('conversations').delete().eq('id', id)
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id))
      if (chatId === id) {
        router.push('/chat')
      }
    } else {
      console.error('Delete error:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-[#0a1839] p-2 text-white md:hidden"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 transform bg-[#09122b] border-r border-[#32457c]/10 transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col p-4">
          {/* New Chat Button */}
          <button 
            onClick={createNewChat}
            className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#c6c6c7] to-[#b8b9ba] p-3 text-sm font-semibold text-[#3f4041] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#000]/20"
          >
            <Plus size={18} />
            New Chat
          </button>

          {/* Chat List */}
          <div className="mt-8 flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            {conversations.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => {
                  router.push(`/chat/${chat.id}`)
                  setIsMobileOpen(false)
                }}
                className={cn(
                  "group flex items-center justify-between rounded-xl p-3 cursor-pointer transition-all duration-200",
                  chatId === chat.id 
                    ? "bg-[#0a2257] text-white ring-1 ring-[#32457c]/50" 
                    : "text-[#96a9e6] hover:bg-[#0a1839] hover:text-white"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={cn(
                    chatId === chat.id ? "text-[#c6c6c7]" : "text-[#32457c]"
                  )} />
                  <span className="truncate text-sm font-medium">{chat.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* User Profile / Logout */}
          <div className="mt-auto border-t border-[#32457c]/20 pt-4">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-medium text-[#96a9e6] hover:bg-[#0a1839] hover:text-white transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

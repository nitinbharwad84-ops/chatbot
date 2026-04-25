'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, User, LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import SettingsModal from './settings-modal'

export default function TopNav() {
  const [user, setUser] = useState<any>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [settingsState, setSettingsState] = useState<{isOpen: boolean, tab: string}>({
    isOpen: false,
    tab: 'general'
  })
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()

    // Listen for auth changes to update user metadata (like avatar)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Get display name and avatar from metadata
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <nav className="h-16 border-b border-[#32457c]/20 bg-[#070d1f]/80 backdrop-blur-md flex items-center justify-between px-6 z-30 relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="md:hidden w-8" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-[#96a9e6] bg-clip-text text-transparent">
            Obsidian AI
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#0a1839] transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#32457c] to-[#0a2257] flex items-center justify-center text-xs font-bold text-white shadow-inner border border-[#c6c6c7]/10 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white line-clamp-1">{displayName}</p>
              </div>
              <ChevronDown size={14} className={`text-[#96a9e6] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#09122b] border border-[#32457c]/30 shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-100">
                  <div className="px-4 py-3 border-b border-[#32457c]/10">
                    <p className="text-xs text-[#96a9e6] font-medium uppercase tracking-wider mb-1">Account</p>
                    <p className="text-sm text-white truncate font-medium">{user?.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSettingsState({ isOpen: true, tab: 'general' })
                      setIsDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#dfe4ff] hover:bg-[#0a2257] transition-colors text-left"
                  >
                    <User size={16} className="text-[#96a9e6]" />
                    Profile Settings
                  </button>
                  
                  <button 
                    onClick={() => {
                      setSettingsState({ isOpen: true, tab: 'preferences' })
                      setIsDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#dfe4ff] hover:bg-[#0a2257] transition-colors text-left"
                  >
                    <Settings size={16} className="text-[#96a9e6]" />
                    App Settings
                  </button>

                  <div className="h-px bg-[#32457c]/10 my-1" />
                  
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <SettingsModal 
        isOpen={settingsState.isOpen} 
        onClose={() => setSettingsState({ ...settingsState, isOpen: false })} 
        user={user}
        initialTab={settingsState.tab}
      />
    </>
  )
}

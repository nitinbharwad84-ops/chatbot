'use client'

import React, { useState, useRef } from 'react'
import { X, User, Mail, Shield, Bell, Settings, Database, Cpu, Trash2, Camera, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  initialTab?: string
}

export default function SettingsModal({ isOpen, onClose, user, initialTab = 'general' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError
      
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to upload avatar')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string

    setSaveStatus('saving')
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      })
      if (error) throw error
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error(err)
      setSaveStatus('idle')
    }
  }

  const handleDeleteAllChats = async () => {
    if (!confirm('Are you sure you want to delete ALL your conversations? This cannot be undone.')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id)
      
      if (error) throw error
      window.dispatchEvent(new CustomEvent('conversationUpdated'))
      alert('All chats deleted successfully.')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User, group: 'Profile' },
    { id: 'security', label: 'Security', icon: Shield, group: 'Profile' },
    { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Profile' },
    { id: 'preferences', label: 'Preferences', icon: Settings, group: 'App' },
    { id: 'models', label: 'AI Models', icon: Cpu, group: 'App' },
    { id: 'data', label: 'Data Management', icon: Database, group: 'App' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#09122b] border border-[#32457c]/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#32457c]/10 bg-[#070d1f]/50 flex flex-col">
          <div className="p-6 border-b border-[#32457c]/10">
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {['Profile', 'App'].map(group => (
              <div key={group}>
                <p className="px-4 text-[10px] font-bold text-[#32457c] uppercase tracking-[0.2em] mb-2">{group}</p>
                <div className="space-y-1">
                  {tabs.filter(t => t.group === group).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        activeTab === tab.id 
                          ? "bg-[#0a2257] text-white shadow-lg shadow-blue-500/10" 
                          : "text-[#96a9e6] hover:bg-[#0a1839] hover:text-white"
                      )}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={onClose}
            className="p-4 text-center text-sm text-[#96a9e6] hover:text-white border-t border-[#32457c]/10 transition-colors"
          >
            Close Settings
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#09122b] p-8">
          <div className="max-w-2xl mx-auto space-y-8">
            
            {activeTab === 'general' && (
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-6">General Profile</h3>
                  
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-8 mb-8">
                    <div className="relative group">
                      <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#32457c] to-[#0a2257] flex items-center justify-center text-3xl font-bold text-white shadow-xl border-2 border-[#32457c]/30 overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : initials}
                      </div>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[#c6c6c7] text-[#070d1f] shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Camera size={16} />
                      </button>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Profile Picture</h4>
                      <p className="text-xs text-[#96a9e6] mt-1">PNG, JPG or GIF. Max 2MB.</p>
                      {loading && <div className="mt-2 flex items-center gap-2 text-xs text-blue-400"><Loader2 size={12} className="animate-spin" /> Uploading...</div>}
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Display Name</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#070d1f] border border-[#32457c]/20 rounded-2xl focus-within:border-[#32457c] transition-colors">
                        <User size={18} className="text-[#32457c]" />
                        <input 
                          name="fullName"
                          type="text" 
                          defaultValue={displayName}
                          className="bg-transparent border-none focus:ring-0 text-white text-sm w-full outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Email Address</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#070d1f]/50 border border-[#32457c]/10 rounded-2xl cursor-not-allowed">
                        <Mail size={18} className="text-[#32457c]/50" />
                        <input 
                          disabled
                          defaultValue={user?.email}
                          className="bg-transparent border-none focus:ring-0 text-[#96a9e6] text-sm w-full outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    disabled={saveStatus === 'saving'}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#32457c] to-[#0a2257] text-sm font-bold text-white shadow-xl shadow-blue-500/10 hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'success' ? <Check size={16} /> : null}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Security & Password</h3>
                <div className="p-6 rounded-2xl bg-[#070d1f]/30 border border-[#32457c]/10 space-y-4">
                  <p className="text-sm text-[#96a9e6]">Update your account security settings.</p>
                  <button className="px-4 py-2 rounded-xl border border-[#32457c]/30 text-sm text-white hover:bg-[#0a1839] transition-colors">
                    Reset Password via Email
                  </button>
                </div>
                
                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-4">
                  <h4 className="text-sm font-bold text-red-400">Two-Factor Authentication</h4>
                  <p className="text-xs text-[#96a9e6]">Add an extra layer of security to your account (Coming soon).</p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Email Notifications', desc: 'Receive updates about your account via email.' },
                    { title: 'New Model Alerts', desc: 'Get notified when we add new AI models.' },
                    { title: 'Usage Limits', desc: 'Receive alerts when you are close to your monthly limit.' }
                  ].map((n, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#070d1f]/30 border border-[#32457c]/10">
                      <div>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-[#96a9e6]">{n.desc}</p>
                      </div>
                      <div className="h-6 w-11 rounded-full bg-[#0a2257] relative cursor-pointer">
                        <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-[#96a9e6]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">App Preferences</h3>
                <div className="grid gap-6">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Theme</label>
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 rounded-2xl bg-[#0a2257] border border-blue-500/50 text-white text-sm font-medium text-center">
                        Obsidian Glass (Default)
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-[#070d1f]/30 border border-[#32457c]/10 text-[#96a9e6] text-sm font-medium text-center cursor-not-allowed">
                        Cloud White
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Enter Key Behavior</label>
                    <select className="w-full px-4 py-3 bg-[#070d1f] border border-[#32457c]/20 rounded-2xl text-white text-sm outline-none appearance-none">
                      <option>Press Enter to send</option>
                      <option>Press Ctrl+Enter to send</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">AI Model Settings</h3>
                <div className="grid gap-4">
                  {[
                    { name: 'Qwen 3 32B', desc: 'Default reasoning model (Fast & Smart)', id: 'qwen/qwen3-32b', status: 'active' },
                    { name: 'Llama 3.3 70B', desc: 'Powerful general purpose model', id: 'llama-3.3-70b-versatile', status: 'available' },
                    { name: 'GPT OSS 120B', desc: 'Maximum intelligence for complex tasks', id: 'openai/gpt-oss-120b', status: 'available' },
                    { name: 'Llama 3.1 8B', desc: 'Lightning fast responses for simple tasks', id: 'llama-3.1-8b-instant', status: 'available' },
                  ].map((m, i) => (
                    <div key={i} className={cn(
                      "p-4 rounded-2xl border transition-all",
                      m.status === 'active' ? "bg-[#0a2257]/30 border-blue-500/30" : "bg-[#070d1f]/30 border-[#32457c]/10 hover:border-[#32457c]/30"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{m.name}</p>
                          <p className="text-xs text-[#96a9e6]">{m.desc}</p>
                        </div>
                        {m.status === 'active' ? (
                          <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-[10px] font-bold text-blue-400 uppercase">Default</span>
                        ) : (
                          <button className="text-[10px] font-bold text-[#32457c] hover:text-[#96a9e6] uppercase">Set Default</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Data & Privacy</h3>
                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-4">
                  <h4 className="text-sm font-bold text-red-400">Danger Zone</h4>
                  <p className="text-xs text-[#96a9e6]">Permanently delete your data. This action is irreversible.</p>
                  
                  <div className="pt-2 space-y-3">
                    <button 
                      onClick={handleDeleteAllChats}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={14} />
                      Delete All Chat History
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-all">
                      Delete Account Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

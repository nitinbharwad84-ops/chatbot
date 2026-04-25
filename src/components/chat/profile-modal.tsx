'use client'

import React from 'react'
import { X, User, Mail, Shield, Bell } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  if (!isOpen) return null

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#09122b] border border-[#32457c]/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#32457c]/10 bg-[#0a1839]/30">
          <h2 className="text-xl font-bold text-white">Profile Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#32457c]/20 text-[#96a9e6] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* Sidebar Nav */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-[#32457c]/10 p-4 space-y-1 bg-[#070d1f]/30">
            <button className="flex w-full items-center gap-3 px-4 py-2 rounded-xl bg-[#0a2257] text-white text-sm font-medium">
              <User size={16} />
              General
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-2 rounded-xl text-[#96a9e6] hover:bg-[#0a1839] text-sm font-medium transition-colors">
              <Shield size={16} />
              Security
            </button>
            <button className="flex w-full items-center gap-3 px-4 py-2 rounded-xl text-[#96a9e6] hover:bg-[#0a1839] text-sm font-medium transition-colors">
              <Bell size={16} />
              Notifications
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#32457c] to-[#0a2257] flex items-center justify-center text-3xl font-bold text-white shadow-xl border-2 border-[#32457c]/30">
                {initials}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{displayName}</h3>
                <p className="text-[#96a9e6] text-sm">{user?.email}</p>
                <button className="mt-3 px-4 py-1.5 rounded-lg border border-[#32457c]/30 text-xs font-semibold text-white hover:bg-[#0a1839] transition-colors">
                  Change Avatar
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Full Name</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-[#070d1f] border border-[#32457c]/20 rounded-2xl">
                  <User size={18} className="text-[#32457c]" />
                  <input 
                    type="text" 
                    defaultValue={displayName}
                    className="bg-transparent border-none focus:ring-0 text-white text-sm w-full outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#96a9e6] uppercase tracking-widest ml-1">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-[#070d1f] border border-[#32457c]/20 rounded-2xl opacity-60">
                  <Mail size={18} className="text-[#32457c]" />
                  <input 
                    type="email" 
                    disabled
                    defaultValue={user?.email}
                    className="bg-transparent border-none focus:ring-0 text-white text-sm w-full outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-4">
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-sm font-semibold text-[#96a9e6] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#32457c] to-[#0a2257] text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:opacity-90 transition-opacity">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

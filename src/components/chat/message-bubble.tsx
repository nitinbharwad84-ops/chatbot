'use client'

import ReactMarkdown from 'react-markdown'
import { Copy, RefreshCcw, Trash2, User, Bot } from 'lucide-react'
import { Message } from '@/types/database'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  onDelete: (id: string) => void
  onRegenerate?: () => void
}

export default function MessageBubble({ message, onDelete, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
  }

  return (
    <div className={cn(
      "flex w-full gap-4 p-6 transition-colors",
      isUser ? "bg-transparent" : "bg-[#0a1839]/30"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border",
        isUser ? "border-[#32457c]/30 text-[#96a9e6]" : "border-[#c6c6c7]/30 bg-[#c6c6c7] text-[#3f4041]"
      )}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-invert max-w-none text-[#dfe4ff]">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={copyToClipboard}
            className="p-1 text-[#96a9e6] hover:text-white"
            title="Copy"
          >
            <Copy size={14} />
          </button>
          {!isUser && onRegenerate && (
            <button 
              onClick={onRegenerate}
              className="p-1 text-[#96a9e6] hover:text-white"
              title="Regenerate"
            >
              <RefreshCcw size={14} />
            </button>
          )}
          <button 
            onClick={() => onDelete(message.id)}
            className="p-1 text-[#96a9e6] hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, RefreshCcw, Trash2, User, Bot, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Message } from '@/types/database'
import { cn } from '@/lib/utils'
import 'katex/dist/katex.min.css'

interface MessageBubbleProps {
  message: Message
  onDelete: (id: string) => void
  onRegenerate?: () => void
}

export default function MessageBubble({ message, onDelete, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [showThought, setShowThought] = useState(false)
  const [copied, setCopied] = useState(false)

  // Extract <think> content if it exists
  const thinkMatch = message.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/)
  const thought = thinkMatch ? thinkMatch[1].trim() : null
  const displayContent = message.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group flex w-full gap-4 p-6 transition-colors border-b border-[#32457c]/10",
      isUser ? "bg-transparent" : "bg-[#0a1839]/20"
    )}>
      <div className={cn(
        "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl border shadow-sm",
        isUser ? "border-[#32457c]/30 text-[#96a9e6] bg-[#070d1f]" : "border-[#c6c6c7]/30 bg-[#c6c6c7] text-[#3f4041]"
      )}>
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        {/* Thought / Reasoning Section */}
        {!isUser && thought && (
          <div className="mb-4 rounded-xl border border-[#32457c]/20 bg-[#070d1f]/50 overflow-hidden">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-[#96a9e6] hover:bg-[#32457c]/10 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bot size={14} className="opacity-70" />
                Reasoning Process
              </span>
              {showThought ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showThought && (
              <div className="px-4 py-3 text-sm text-[#96a9e6]/70 italic border-t border-[#32457c]/10 leading-relaxed whitespace-pre-wrap">
                {thought}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="prose prose-invert max-w-none text-[#dfe4ff] selection:bg-[#32457c]/40">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]} 
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              // Prevent browser error for <think> tag
              think: ({ children }: { children: React.ReactNode }) => <>{children}</>,
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <div className="relative group/code my-4">
                    <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigator.clipboard.writeText(String(children))}
                        className="p-1.5 rounded-lg bg-[#070d1f] border border-[#32457c]/30 text-[#96a9e6] hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <SyntaxHighlighter
                      {...props}
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      className="!rounded-xl !bg-[#070d1f] !p-4 !m-0 border border-[#32457c]/20"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={cn("bg-[#32457c]/20 px-1.5 py-0.5 rounded-md text-[#c6c6c7]", className)} {...props}>
                    {children}
                  </code>
                )
              }
            } as any}
          >
            {displayContent}
          </ReactMarkdown>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-[#96a9e6] hover:text-white hover:bg-[#32457c]/10 transition-all"
            title="Copy message"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span className="text-[10px] font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          {!isUser && onRegenerate && (
            <button 
              onClick={onRegenerate}
              className="flex items-center gap-1.5 p-1.5 rounded-lg text-[#96a9e6] hover:text-white hover:bg-[#32457c]/10 transition-all"
              title="Regenerate"
            >
              <RefreshCcw size={14} />
              <span className="text-[10px] font-medium">Regenerate</span>
            </button>
          )}
          <button 
            onClick={() => onDelete(message.id)}
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-[#96a9e6] hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
            <span className="text-[10px] font-medium">Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
]

interface ChatInputProps {
  onSend: (message: string, model: string) => void
  onModelChange?: (modelId: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, onModelChange, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(MODELS[1].id)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input, selectedModel)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleModelSelect = (id: string) => {
    setSelectedModel(id)
    onModelChange?.(id)
  }

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#070d1f] via-[#070d1f] to-transparent pt-10 pb-8 px-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Model Selector */}
        <div className="flex justify-center gap-2">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all border",
                selectedModel === model.id 
                  ? "bg-[#c6c6c7] border-[#c6c6c7] text-[#3f4041]" 
                  : "bg-transparent border-[#32457c]/30 text-[#96a9e6] hover:border-[#32457c]"
              )}
            >
              {model.name}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="relative flex items-center rounded-2xl bg-[#0a1839]/80 p-2 shadow-2xl ring-1 ring-[#32457c]/30 backdrop-blur-xl">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 max-h-48 resize-none bg-transparent px-4 py-3 text-[#dfe4ff] placeholder:text-[#96a9e6]/50 focus:outline-none sm:text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="rounded-xl bg-gradient-to-r from-[#c6c6c7] to-[#b8b9ba] p-2 text-[#3f4041] transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={20} />
          </button>
        </div>
        
        <p className="text-center text-[10px] text-[#96a9e6]/40 uppercase tracking-widest">
          Groq Powered Intelligence
        </p>
      </div>
    </div>
  )
}

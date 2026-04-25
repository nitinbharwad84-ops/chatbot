'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = mode === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name
            }
          }
        })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // For signup, if confirmation is disabled in Supabase, this will redirect correctly
      router.push('/chat')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070d1f] p-4 font-inter">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#0a1839]/50 p-8 backdrop-blur-xl border border-[#32457c]/20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-[#96a9e6]">
            {mode === 'login' ? 'Sign in to your account' : 'Start your AI journey today'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4 rounded-md shadow-sm">
            {mode === 'signup' && (
              <div>
                <input
                  type="text"
                  required
                  className="relative block w-full rounded-xl border-0 bg-[#070d1f] py-3 text-white ring-1 ring-inset ring-[#32457c]/30 placeholder:text-[#96a9e6]/50 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#c6c6c7] sm:text-sm sm:leading-6"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <input
                type="email"
                required
                className="relative block w-full rounded-xl border-0 bg-[#070d1f] py-3 text-white ring-1 ring-inset ring-[#32457c]/30 placeholder:text-[#96a9e6]/50 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#c6c6c7] sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="relative block w-full rounded-xl border-0 bg-[#070d1f] py-3 text-white ring-1 ring-inset ring-[#32457c]/30 placeholder:text-[#96a9e6]/50 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#c6c6c7] sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-[#c6c6c7] to-[#b8b9ba] px-3 py-3 text-sm font-semibold text-[#3f4041] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6c6c7] disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <Link 
            href={mode === 'login' ? '/signup' : '/login'} 
            className="font-medium text-[#c6c6c7] hover:text-white"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setLoading(false)
      if (error) {
        setError(error.message)
      } else if (data?.session) {
        router.push('/')
        router.refresh()
      } else {
        setMessage('Check your email for the confirmation link.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setLoading(false)
      if (error) {
        setError(error.message)
      } else if (data?.session) {
        router.push('/')
        router.refresh()
      }
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: 'var(--bg-primary)'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
          borderRadius: 'var(--radius-lg)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', boxShadow: 'var(--accent-glow)'
        }}>
          <Zap size={30} color="#fff" fill="#fff" />
        </div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>FitTrack</h1>
        <p className="text-secondary">Your personal fitness companion</p>
      </div>

      {/* Card */}
      <div className="card-elevated" style={{ width: '100%', maxWidth: '380px' }}>
        <h2 style={{ marginBottom: '6px', fontSize: '1.25rem' }}>{isSignUp ? 'Create an account' : 'Sign in'}</h2>
        <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '24px' }}>
          {isSignUp ? 'Sign up with your email and password' : 'Enter your email and password'}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}
        
        {message && (
          <div className="alert alert-success" style={{ marginBottom: '16px', background: 'var(--green-dim)', color: 'var(--green)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> {isSignUp ? 'Signing up...' : 'Signing in...'}</>
            ) : (
              <>{isSignUp ? 'Sign up' : 'Sign in'}</>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setMessage('')
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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
        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 56, height: 56, background: 'var(--green-dim)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Mail size={24} color="var(--green)" />
            </div>
            <h2 style={{ marginBottom: '8px' }}>Check your email</h2>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              We sent a magic link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              Click it to sign in — no password needed.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ marginBottom: '6px', fontSize: '1.25rem' }}>Sign in</h2>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '24px' }}>
              We'll email you a magic link
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
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

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || !email}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending…</>
                ) : (
                  <>Send magic link</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

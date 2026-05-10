'use client'
export const dynamic = 'force-dynamic'

import { useChat } from '@ai-sdk/react'
import { Send, User, Sparkles, AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function CoachPage() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error } = useChat()
  
  const isLoading = status === 'submitted' || status === 'streaming'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ parts: [{ type: 'text', text: input }] })
    setInput('')
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <h1 style={{ marginBottom: '4px' }}>AI Coach</h1>
        <p className="text-secondary text-sm">Data-grounded fitness advice</p>
      </div>

      {/* Chat History */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingRight: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingBottom: '24px'
        }}
      >
        {/* Welcome Message */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: 'var(--accent-glow)'
          }}>
            <Sparkles size={16} />
          </div>
          <div style={{
            background: 'rgba(108,99,255,0.08)',
            border: '1px solid rgba(108,99,255,0.2)',
            padding: '12px 16px',
            borderRadius: '4px var(--radius-lg) var(--radius-lg) var(--radius-lg)',
            maxWidth: '85%', color: 'var(--fg)', fontSize: '0.9375rem', lineHeight: 1.5
          }}>
            Hey! I'm your AI Coach. I already know what you did in your recent workouts. Ask me anything about your progress, PRs, or what you should do next!
          </div>
        </div>
        {messages.map(m => (
          <div 
            key={m.id} 
            style={{
              display: 'flex',
              gap: '12px',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), #9c6bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: m.role === 'user' ? 'none' : 'var(--accent-glow)'
            }}>
              {m.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>

            {/* Message Bubble */}
            <div style={{
              background: m.role === 'user' ? 'var(--bg-elevated)' : 'rgba(108,99,255,0.08)',
              border: m.role === 'user' ? '1px solid var(--border)' : '1px solid rgba(108,99,255,0.2)',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? 'var(--radius-lg) 4px var(--radius-lg) var(--radius-lg)' : '4px var(--radius-lg) var(--radius-lg) var(--radius-lg)',
              maxWidth: '85%',
              color: 'var(--fg)',
              fontSize: '0.9375rem',
              lineHeight: 1.5
            }}>
              {m.parts?.map((part: any, index: number) => {
                if (part.type === 'text' && part.text) {
                  return (
                    <div key={`text-${index}`} className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div style={{ padding: '12px', color: 'var(--secondary)' }}>
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            display: 'flex', gap: '8px', alignItems: 'center', 
            color: 'var(--danger)', background: 'rgba(255,71,87,0.1)', 
            padding: '12px', borderRadius: 'var(--radius-md)' 
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem' }}>Failed to connect to AI Coach. Check your API key.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: 'auto',
          flexShrink: 0,
          background: 'var(--bg)',
          paddingTop: '16px'
        }}
      >
        <input
          value={input || ''}
          onChange={handleInputChange}
          placeholder="Ask about your progress..."
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '12px 20px',
            color: 'var(--fg)',
            outline: 'none',
            fontSize: '0.9375rem'
          }}
        />
        <button 
          type="submit" 
          disabled={!(input || '').trim() || isLoading}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: (input || '').trim() && !isLoading ? 'var(--accent)' : 'var(--border)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: (input || '').trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s'
          }}
        >
          <Send size={18} style={{ marginLeft: 2 }} />
        </button>
      </form>
    </div>
  )
}

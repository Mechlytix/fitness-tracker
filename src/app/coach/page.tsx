'use client'
export const dynamic = 'force-dynamic'

import { useChat } from '@ai-sdk/react'
import { Send, User, Sparkles, AlertCircle, Loader2, RefreshCw, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function CoachPage() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Weekly check-in
  const [showCheckin, setShowCheckin] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinResult, setCheckinResult] = useState<any>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ parts: [{ type: 'text', text: input }] })
    setInput('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function runCheckin() {
    setCheckinLoading(true)
    setShowCheckin(true)
    try {
      const res = await fetch('/api/coach/checkin', { method: 'POST' })
      if (res.ok) setCheckinResult(await res.json())
    } catch {}
    setCheckinLoading(false)
  }

  async function applyNutrition() {
    if (!checkinResult?.nutrition_adjustments) return
    setApplying(true)
    const n = checkinResult.nutrition_adjustments
    await fetch('/api/food/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calories: n.calories, protein_g: n.protein_g, carbs_g: n.carbs_g, fat_g: n.fat_g }),
    })
    setApplying(false)
    setApplied(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
        <div>
          <h1 style={{ marginBottom: '2px' }}>AI Coach</h1>
          <p className="text-secondary text-sm">Training + nutrition advice</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={runCheckin}>
          <RefreshCw size={13} /> Weekly Check-in
        </button>
      </div>

      {/* Check-in Modal */}
      {showCheckin && (
        <div className="modal-overlay" onClick={() => !checkinLoading && setShowCheckin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-handle" />
            {checkinLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                <h3>Analyzing your week…</h3>
                <p className="text-secondary text-sm">Reviewing workouts, nutrition, and weight trends</p>
              </div>
            ) : checkinResult ? (
              <div>
                <h3 style={{ marginBottom: '16px' }}>📊 Weekly Review</h3>

                {checkinResult.motivation && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px',
                    background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(156,107,255,0.04))',
                    border: '1px solid rgba(108,99,255,0.15)', fontStyle: 'italic', fontSize: '0.85rem',
                  }}>
                    {checkinResult.motivation}
                  </div>
                )}

                {checkinResult.insights && (
                  <div className="card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>💡 Insights</div>
                    <div className="prose prose-sm" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{checkinResult.insights}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {checkinResult.workout_adjustments && (
                  <div className="card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>🏋️ Training Adjustments</div>
                    <div className="prose prose-sm" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{checkinResult.workout_adjustments}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {checkinResult.nutrition_adjustments && (
                  <div className="card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>🍽️ Nutrition Adjustments</div>
                    <div className="stat-grid" style={{ marginBottom: '8px' }}>
                      <div className="stat-tile"><div className="stat-label">Calories</div><div className="stat-value">{checkinResult.nutrition_adjustments.calories}</div></div>
                      <div className="stat-tile"><div className="stat-label">Protein</div><div className="stat-value">{checkinResult.nutrition_adjustments.protein_g}g</div></div>
                      <div className="stat-tile"><div className="stat-label">Carbs</div><div className="stat-value">{checkinResult.nutrition_adjustments.carbs_g}g</div></div>
                      <div className="stat-tile"><div className="stat-label">Fat</div><div className="stat-value">{checkinResult.nutrition_adjustments.fat_g}g</div></div>
                    </div>
                    {checkinResult.nutrition_adjustments.reasoning && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{checkinResult.nutrition_adjustments.reasoning}</p>
                    )}
                    {!applied ? (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '8px' }} onClick={applyNutrition} disabled={applying}>
                        {applying ? <><Loader2 size={12} className="animate-spin" /> Applying…</> : <>Apply New Targets</>}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--green)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Check size={14} /> Targets updated!
                      </div>
                    )}
                  </div>
                )}

                {checkinResult.goal_progress?.length > 0 && (
                  <div className="card" style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>🎯 Goal Progress</div>
                    {checkinResult.goal_progress.map((g: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: '0.75rem' }}>
                          {g.status === 'on_track' ? '🟢' : g.status === 'ahead' ? '🔵' : '🟡'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{g.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{g.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn btn-ghost btn-full btn-sm" onClick={() => setShowCheckin(false)}>Close</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <p className="text-secondary">Could not complete check-in. Try again.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat History */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
        {/* Welcome */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Sparkles size={16} />
          </div>
          <div style={{
            background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
            padding: '12px 16px', borderRadius: '4px var(--radius-lg) var(--radius-lg) var(--radius-lg)',
            maxWidth: '85%', fontSize: '0.9375rem', lineHeight: 1.5,
          }}>
            Hey! I'm your AI Coach — I know your <strong>workouts, nutrition, body stats, and goals</strong>. Ask me anything about your training, diet, or what to do next!
          </div>
        </div>

        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: '12px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), #9c6bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              {m.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
            </div>
            <div style={{
              background: m.role === 'user' ? 'var(--bg-elevated)' : 'rgba(108,99,255,0.08)',
              border: m.role === 'user' ? '1px solid var(--border)' : '1px solid rgba(108,99,255,0.2)',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? 'var(--radius-lg) 4px var(--radius-lg) var(--radius-lg)' : '4px var(--radius-lg) var(--radius-lg) var(--radius-lg)',
              maxWidth: '85%', fontSize: '0.9375rem', lineHeight: 1.5,
            }}>
              {m.parts?.map((part: any, index: number) => {
                if (part.type === 'text' && part.text) {
                  return (
                    <div key={`text-${index}`} className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>Thinking...</div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--red)', background: 'rgba(255,71,87,0.1)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem' }}>Failed to connect to AI Coach. Check your API key.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexShrink: 0, background: 'var(--bg-primary)', paddingTop: '16px' }}>
        <input
          value={input || ''}
          onChange={handleInputChange}
          placeholder="Ask about training, nutrition, progress…"
          disabled={isLoading}
          style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)', padding: '12px 20px', color: 'var(--text-primary)',
            outline: 'none', fontSize: '0.9375rem',
          }}
        />
        <button type="submit" disabled={!(input || '').trim() || isLoading} style={{
          width: 48, height: 48, borderRadius: '50%',
          background: (input || '').trim() && !isLoading ? 'var(--accent)' : 'var(--border)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: (input || '').trim() && !isLoading ? 'pointer' : 'not-allowed',
        }}>
          <Send size={18} style={{ marginLeft: 2 }} />
        </button>
      </form>
    </div>
  )
}

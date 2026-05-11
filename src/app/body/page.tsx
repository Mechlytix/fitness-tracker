'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Scale, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type WeightEntry = { id: string; log_date: string; weight_kg: number }

export default function BodyPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/weight?limit=60')
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!newWeight) return
    setSaving(true)
    await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: parseFloat(newWeight), log_date: newDate }),
    })
    setSaving(false)
    setShowAdd(false)
    setNewWeight('')
    load()
  }

  const latest = entries[0]?.weight_kg ?? null
  const oldest = entries.length > 1 ? entries[entries.length - 1].weight_kg : null
  const change = latest && oldest ? Math.round((latest - oldest) * 10) / 10 : null
  const weekEntries = entries.filter(e => {
    const d = new Date(e.log_date)
    return d >= new Date(Date.now() - 7 * 86400000)
  })
  const weekAvg = weekEntries.length > 0
    ? Math.round(weekEntries.reduce((s, e) => s + e.weight_kg, 0) / weekEntries.length * 10) / 10
    : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Body & Weight</h1>
          <p className="text-secondary text-sm">Track your body composition</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Log Weight
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-tile">
          <div className="stat-label">Current</div>
          <div className="stat-value">{latest ?? '—'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">7-Day Avg</div>
          <div className="stat-value">{weekAvg ?? '—'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Change</div>
          <div className="stat-value" style={{ color: change ? (change > 0 ? 'var(--red)' : 'var(--green)') : 'var(--text-primary)' }}>
            {change != null ? `${change > 0 ? '+' : ''}${change}` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>kg total</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Entries</div>
          <div className="stat-value">{entries.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>logged</div>
        </div>
      </div>

      {/* Simple chart */}
      {entries.length > 1 && (
        <div className="card-elevated" style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '12px' }}>Weight Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px' }}>
            {[...entries].reverse().slice(-30).map((e, i, arr) => {
              const min = Math.min(...arr.map(x => x.weight_kg))
              const max = Math.max(...arr.map(x => x.weight_kg))
              const range = max - min || 1
              const h = ((e.weight_kg - min) / range) * 80 + 10
              return (
                <div key={e.id} title={`${e.log_date}: ${e.weight_kg}kg`} style={{
                  flex: 1, height: `${h}%`, background: 'var(--accent)', borderRadius: '2px 2px 0 0',
                  opacity: 0.5 + (i / arr.length) * 0.5, minWidth: '3px',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>{[...entries].reverse().slice(-30)[0]?.log_date}</span>
            <span>{entries[0]?.log_date}</span>
          </div>
        </div>
      )}

      {/* History */}
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 className="section-title">History</h2>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          <Scale size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p>No weight entries yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {entries.slice(0, 20).map((e, i) => {
            const prev = entries[i + 1]
            const diff = prev ? Math.round((e.weight_kg - prev.weight_kg) * 10) / 10 : null
            return (
              <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{e.weight_kg} kg</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.log_date}</div>
                </div>
                {diff != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: 600, color: diff > 0 ? 'var(--red)' : diff < 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                    {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {diff > 0 ? '+' : ''}{diff}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Weight Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '16px' }}>Log Weight</h3>
            <div className="input-group">
              <label className="input-label">Weight (kg)</label>
              <input type="number" className="input" placeholder="80.5" value={newWeight}
                onChange={e => setNewWeight(e.target.value)} inputMode="decimal" autoFocus step="0.1" />
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" className="input" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={saving || !newWeight}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

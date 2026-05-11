'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, Save,
  ChevronDown, ChevronUp, GripVertical
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Exercise = { id: string; name: string; exercise_categories: { name: string } | null }

type PlanSet = {
  id: string
  target_weight_kg: string
  target_reps: string
}

type PlanExercise = {
  localId: string
  exercise: Exercise
  sets: PlanSet[]
  notes: string
}

type PlanDay = {
  localId: string
  day_name: string
  weekday: number | null
  notes: string
  exercises: PlanExercise[]
}

function genId() { return Math.random().toString(36).slice(2) }

const WEEKDAYS = [
  { value: null, label: 'Flexible' },
  { value: 0, label: 'Mon' }, { value: 1, label: 'Tue' }, { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' }, { value: 4, label: 'Fri' }, { value: 5, label: 'Sat' }, { value: 6, label: 'Sun' },
]

export default function NewPlanPage() {
  const router = useRouter()
  const supabase = createClient()

  const [planName, setPlanName] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [days, setDays] = useState<PlanDay[]>([
    { localId: genId(), day_name: 'Day 1', weekday: null, notes: '', exercises: [] }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Exercise picker state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [exSearch, setExSearch] = useState('')
  const [loadingEx, setLoadingEx] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadExercises = useCallback(async () => {
    setLoadingEx(true)
    const { data } = await supabase
      .from('exercises')
      .select('id, name, exercise_categories(name)')
      .order('name')
    if (data) setAllExercises(data as Exercise[])
    setLoadingEx(false)
  }, [supabase])

  useEffect(() => { loadExercises() }, [loadExercises])
  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showPicker])

  // ── Day operations ──
  function addDay() {
    setDays(prev => [...prev, {
      localId: genId(), day_name: `Day ${prev.length + 1}`, weekday: null, notes: '', exercises: []
    }])
  }

  function removeDay(localId: string) {
    setDays(prev => prev.filter(d => d.localId !== localId))
  }

  function updateDay(localId: string, field: string, value: any) {
    setDays(prev => prev.map(d => d.localId === localId ? { ...d, [field]: value } : d))
  }

  // ── Exercise operations ──
  function openPicker(dayId: string) {
    setPickerDayId(dayId)
    setShowPicker(true)
    setExSearch('')
  }

  function addExercise(dayId: string, ex: Exercise) {
    setDays(prev => prev.map(d => {
      if (d.localId !== dayId) return d
      return {
        ...d,
        exercises: [...d.exercises, {
          localId: genId(), exercise: ex, notes: '',
          sets: [{ id: genId(), target_weight_kg: '', target_reps: '' }]
        }]
      }
    }))
    setShowPicker(false)
  }

  function removeExercise(dayId: string, exId: string) {
    setDays(prev => prev.map(d => {
      if (d.localId !== dayId) return d
      return { ...d, exercises: d.exercises.filter(e => e.localId !== exId) }
    }))
  }

  // ── Set operations ──
  function addSet(dayId: string, exId: string) {
    setDays(prev => prev.map(d => {
      if (d.localId !== dayId) return d
      return {
        ...d,
        exercises: d.exercises.map(e => {
          if (e.localId !== exId) return e
          const last = e.sets[e.sets.length - 1]
          return {
            ...e, sets: [...e.sets, {
              id: genId(),
              target_weight_kg: last?.target_weight_kg ?? '',
              target_reps: last?.target_reps ?? '',
            }]
          }
        })
      }
    }))
  }

  function removeSet(dayId: string, exId: string, setId: string) {
    setDays(prev => prev.map(d => {
      if (d.localId !== dayId) return d
      return {
        ...d,
        exercises: d.exercises.map(e => {
          if (e.localId !== exId) return e
          return { ...e, sets: e.sets.filter(s => s.id !== setId) }
        })
      }
    }))
  }

  function updateSet(dayId: string, exId: string, setId: string, field: string, value: string) {
    setDays(prev => prev.map(d => {
      if (d.localId !== dayId) return d
      return {
        ...d,
        exercises: d.exercises.map(e => {
          if (e.localId !== exId) return e
          return { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
        })
      }
    }))
  }

  // ── Save ──
  async function handleSave() {
    if (!planName.trim()) { setError('Plan needs a name.'); return }
    if (days.length === 0) { setError('Add at least one day.'); return }
    if (days.some(d => d.exercises.length === 0)) { setError('Each day needs at least one exercise.'); return }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    // Deactivate existing plans
    await supabase.from('workout_plans').update({ is_active: false }).eq('user_id', user.id)

    const { data: plan, error: pErr } = await supabase
      .from('workout_plans')
      .insert({ user_id: user.id, name: planName, description: planDesc || null, is_active: true })
      .select('id')
      .single()

    if (pErr || !plan) { setError(pErr?.message ?? 'Failed'); setSaving(false); return }

    for (let di = 0; di < days.length; di++) {
      const d = days[di]
      const { data: dayRow, error: dErr } = await supabase
        .from('plan_days')
        .insert({ plan_id: plan.id, day_name: d.day_name, day_order: di, weekday: d.weekday, notes: d.notes || null })
        .select('id')
        .single()

      if (dErr || !dayRow) continue

      for (let ei = 0; ei < d.exercises.length; ei++) {
        const ex = d.exercises[ei]
        const { data: exRow, error: eErr } = await supabase
          .from('plan_exercises')
          .insert({ plan_day_id: dayRow.id, exercise_id: ex.exercise.id, exercise_order: ei, notes: ex.notes || null })
          .select('id')
          .single()

        if (eErr || !exRow) continue

        const sets = ex.sets.map((s, si) => ({
          plan_exercise_id: exRow.id,
          set_order: si,
          target_weight_kg: s.target_weight_kg ? parseFloat(s.target_weight_kg) : null,
          target_reps: s.target_reps ? parseInt(s.target_reps) : null,
        }))
        if (sets.length > 0) await supabase.from('plan_sets').insert(sets)
      }
    }

    setSaving(false)
    router.push('/plans')
  }

  const filteredEx = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exSearch.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/plans" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>Create Plan</h1>
          <p className="text-secondary text-sm">Build your own workout plan</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save</>}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Plan details */}
      <div className="card-elevated" style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label className="input-label" htmlFor="plan-name">Plan Name</label>
          <input id="plan-name" className="input" placeholder="e.g., Push Pull Legs" value={planName} onChange={e => setPlanName(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="plan-desc">Description (optional)</label>
          <input id="plan-desc" className="input" placeholder="Brief description..." value={planDesc} onChange={e => setPlanDesc(e.target.value)} />
        </div>
      </div>

      {/* Days */}
      {days.map((day, dayIdx) => (
        <DayBlock
          key={day.localId}
          day={day}
          dayIdx={dayIdx}
          onUpdateDay={(f, v) => updateDay(day.localId, f, v)}
          onRemoveDay={() => removeDay(day.localId)}
          onOpenPicker={() => openPicker(day.localId)}
          onRemoveExercise={(exId) => removeExercise(day.localId, exId)}
          onAddSet={(exId) => addSet(day.localId, exId)}
          onRemoveSet={(exId, setId) => removeSet(day.localId, exId, setId)}
          onUpdateSet={(exId, setId, f, v) => updateSet(day.localId, exId, setId, f, v)}
        />
      ))}

      <button className="btn btn-secondary btn-full" style={{ borderStyle: 'dashed', marginBottom: '24px' }} onClick={addDay}>
        <Plus size={16} /> Add Day
      </button>

      {/* Exercise picker modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '16px' }}>Choose Exercise</h3>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input ref={searchRef} className="input" placeholder="Search…" value={exSearch} onChange={e => setExSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
            </div>
            {loadingEx ? (
              <div style={{ textAlign: 'center', padding: '24px' }}><Loader2 size={20} className="animate-spin" color="var(--text-muted)" /></div>
            ) : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredEx.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No exercises found</p>
                ) : filteredEx.map(ex => (
                  <button key={ex.id} onClick={() => pickerDayId && addExercise(pickerDayId, ex)} style={{
                    width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', textAlign: 'left'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 36, height: 36, background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>💪</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ex.name}</div>
                      {ex.exercise_categories?.name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.exercise_categories.name}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Day Block ──
type DayBlockProps = {
  day: PlanDay; dayIdx: number
  onUpdateDay: (field: string, value: any) => void
  onRemoveDay: () => void
  onOpenPicker: () => void
  onRemoveExercise: (exId: string) => void
  onAddSet: (exId: string) => void
  onRemoveSet: (exId: string, setId: string) => void
  onUpdateSet: (exId: string, setId: string, field: string, value: string) => void
}

function DayBlock({ day, dayIdx, onUpdateDay, onRemoveDay, onOpenPicker, onRemoveExercise, onAddSet, onRemoveSet, onUpdateSet }: DayBlockProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="card-elevated" style={{ marginBottom: '16px' }}>
      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: collapsed ? 0 : '14px' }}>
        <div style={{
          width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0
        }}>{dayIdx + 1}</div>
        <input className="input" style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem' }}
          value={day.day_name} onChange={e => onUpdateDay('day_name', e.target.value)} placeholder="Day name" />
        <select className="input" style={{ width: '90px', fontSize: '0.75rem', padding: '6px 8px' }}
          value={day.weekday ?? ''} onChange={e => onUpdateDay('weekday', e.target.value === '' ? null : parseInt(e.target.value))}>
          {WEEKDAYS.map(w => <option key={w.label} value={w.value ?? ''}>{w.label}</option>)}
        </select>
        <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px', color: 'var(--red)' }} onClick={onRemoveDay}>
          <Trash2 size={15} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Exercises in this day */}
          {day.exercises.map((ex, exIdx) => (
            <div key={ex.localId} style={{ marginBottom: '14px', paddingLeft: '8px', borderLeft: '2px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                  {ex.exercise.name}
                </span>
                <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{ex.sets.length} sets</span>
                <button onClick={() => onRemoveExercise(ex.localId)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px'
                }}><Trash2 size={12} /></button>
              </div>

              {/* Sets */}
              <div style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px',
                gap: '6px', padding: '2px 0 6px', fontSize: '0.65rem', color: 'var(--text-muted)'
              }}>
                <div style={{ textAlign: 'center' }}>#</div>
                <div style={{ textAlign: 'center' }}>kg</div>
                <div style={{ textAlign: 'center' }}>reps</div>
                <div />
              </div>
              {ex.sets.map((s, sIdx) => (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 28px', gap: '6px', alignItems: 'center', padding: '2px 0' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{sIdx + 1}</div>
                  <input type="number" className="set-input" placeholder="0" min="0" step="0.5" inputMode="decimal"
                    value={s.target_weight_kg} onChange={e => onUpdateSet(ex.localId, s.id, 'target_weight_kg', e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '5px 4px' }} />
                  <input type="number" className="set-input" placeholder="0" min="0" inputMode="numeric"
                    value={s.target_reps} onChange={e => onUpdateSet(ex.localId, s.id, 'target_reps', e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '5px 4px' }} />
                  <button onClick={() => onRemoveSet(ex.localId, s.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}><Trash2 size={11} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--accent)', padding: '3px 8px' }}
                onClick={() => onAddSet(ex.localId)}>
                <Plus size={11} /> Set
              </button>
            </div>
          ))}

          <button className="btn btn-ghost btn-sm btn-full" style={{ color: 'var(--accent)', borderStyle: 'dashed', border: '1px dashed var(--border)' }}
            onClick={onOpenPicker}>
            <Plus size={13} /> Add Exercise
          </button>
        </>
      )}
    </div>
  )
}

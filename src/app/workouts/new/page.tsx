'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Trash2, Check, Search,
  ChevronDown, ChevronUp, Loader2, Save
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type Exercise = { id: string; name: string; exercise_categories: { name: string } | null }

type SetRow = {
  id: string   // local temp id
  weight_kg: string
  reps: string
  completed: boolean
}

type WorkoutExercise = {
  localId: string
  exercise: Exercise
  sets: SetRow[]
}

function genId() { return Math.random().toString(36).slice(2) }

export default function NewWorkoutPage() {
  const router = useRouter()
  const supabase = createClient()

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Exercise picker
  const [showPicker, setShowPicker] = useState(false)
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

  function addExercise(ex: Exercise) {
    setExercises(prev => [...prev, {
      localId: genId(),
      exercise: ex,
      sets: [{ id: genId(), weight_kg: '', reps: '', completed: false }]
    }])
    setShowPicker(false)
    setExSearch('')
  }

  function removeExercise(localId: string) {
    setExercises(prev => prev.filter(e => e.localId !== localId))
  }

  function addSet(localId: string) {
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      const lastSet = e.sets[e.sets.length - 1]
      return {
        ...e,
        sets: [...e.sets, {
          id: genId(),
          weight_kg: lastSet?.weight_kg ?? '',
          reps: lastSet?.reps ?? '',
          completed: false,
        }]
      }
    }))
  }

  function removeSet(localId: string, setId: string) {
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      return { ...e, sets: e.sets.filter(s => s.id !== setId) }
    }))
  }

  function updateSet(localId: string, setId: string, field: keyof SetRow, value: string | boolean) {
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      return {
        ...e,
        sets: e.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      }
    }))
  }

  function toggleComplete(localId: string, setId: string) {
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      return {
        ...e,
        sets: e.sets.map(s => s.id === setId ? { ...s, completed: !s.completed } : s)
      }
    }))
  }

  async function handleSave() {
    if (exercises.length === 0) { setError('Add at least one exercise.'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    // 1. Create workout
    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, workout_date: date, notes: notes || null })
      .select('id')
      .single()

    if (wErr || !workout) { setError(wErr?.message ?? 'Failed to save'); setSaving(false); return }

    // 2. Insert all sets
    const allSets = exercises.flatMap((we, exIdx) =>
      we.sets.map((s, setIdx) => ({
        workout_id: workout.id,
        exercise_id: we.exercise.id,
        set_order: exIdx * 100 + setIdx,
        weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
        reps: s.reps ? parseInt(s.reps) : null,
      }))
    )

    const { error: sErr } = await supabase.from('workout_sets').insert(allSets)
    if (sErr) { setError(sErr.message); setSaving(false); return }

    router.push(`/workouts/${workout.id}`)
  }

  const filteredEx = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exSearch.toLowerCase())
  )

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const completedSets = exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/workouts" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>New Workout</h1>
          {totalSets > 0 && (
            <p className="text-sm text-secondary">
              {completedSets}/{totalSets} sets done
            </p>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving || exercises.length === 0}
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save</>
          }
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Date & Notes */}
      <div className="card-elevated" style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label className="input-label" htmlFor="workout-date">Date</label>
          <input
            id="workout-date"
            type="date"
            className="input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="workout-notes">Notes (optional)</label>
          <input
            id="workout-notes"
            className="input"
            placeholder="How did it feel? Any notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Exercises */}
      {exercises.map((we, exIdx) => (
        <ExerciseBlock
          key={we.localId}
          we={we}
          exIdx={exIdx}
          onRemove={() => removeExercise(we.localId)}
          onAddSet={() => addSet(we.localId)}
          onRemoveSet={(sId) => removeSet(we.localId, sId)}
          onUpdateSet={(sId, f, v) => updateSet(we.localId, sId, f, v)}
          onToggleComplete={(sId) => toggleComplete(we.localId, sId)}
        />
      ))}

      {/* Add Exercise Button */}
      <button
        className="btn btn-secondary btn-full"
        style={{ marginBottom: '24px', borderStyle: 'dashed' }}
        onClick={() => setShowPicker(true)}
      >
        <Plus size={16} /> Add Exercise
      </button>

      {/* Exercise Picker Modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '16px' }}>Choose Exercise</h3>

            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={15} style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)'
              }} />
              <input
                ref={searchRef}
                className="input"
                placeholder="Search…"
                value={exSearch}
                onChange={e => setExSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {loadingEx ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredEx.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No exercises found
                  </p>
                ) : (
                  filteredEx.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      style={{
                        width: '100%', padding: '12px', display: 'flex',
                        alignItems: 'center', gap: '12px', background: 'none',
                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                        transition: 'background var(--transition)', textAlign: 'left'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{
                        width: 36, height: 36, background: 'var(--accent-dim)',
                        borderRadius: 'var(--radius-sm)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        💪
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {ex.name}
                        </div>
                        {ex.exercise_categories?.name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ex.exercise_categories.name}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <Link href="/exercises/new" className="btn btn-secondary btn-full btn-sm">
                <Plus size={14} /> Create new exercise
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Exercise Block sub-component
// ──────────────────────────────────────────────
type ExerciseBlockProps = {
  we: WorkoutExercise
  exIdx: number
  onRemove: () => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onUpdateSet: (setId: string, field: keyof SetRow, value: string | boolean) => void
  onToggleComplete: (setId: string) => void
}

function ExerciseBlock({ we, exIdx, onRemove, onAddSet, onRemoveSet, onUpdateSet, onToggleComplete }: ExerciseBlockProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="card-elevated" style={{ marginBottom: '16px' }}>
      {/* Exercise header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: collapsed ? 0 : '12px' }}>
        <div style={{
          width: 32, height: 32, background: 'var(--accent-dim)',
          borderRadius: 'var(--radius-sm)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0
        }}>
          {exIdx + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {we.exercise.name}
          </div>
          {we.exercise.exercise_categories?.name && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {we.exercise.exercise_categories.name}
            </div>
          )}
        </div>
        <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px', color: 'var(--red)' }} onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
            gap: '8px', padding: '4px 0 8px',
            borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>#</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>kg</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>reps</div>
            <div />
          </div>

          {/* Sets */}
          {we.sets.map((s, sIdx) => (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
              gap: '8px', alignItems: 'center', padding: '4px 0',
              opacity: s.completed ? 0.6 : 1,
              transition: 'opacity var(--transition)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => onToggleComplete(s.id)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: s.completed ? 'var(--green)' : 'var(--bg-primary)',
                    border: `1.5px solid ${s.completed ? 'var(--green)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all var(--transition)', margin: '0 auto'
                  }}
                >
                  {s.completed
                    ? <Check size={12} color="#fff" strokeWidth={3} />
                    : <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{sIdx + 1}</span>
                  }
                </button>
              </div>
              <input
                type="number"
                className="set-input"
                placeholder="0"
                min="0"
                step="0.5"
                value={s.weight_kg}
                onChange={e => onUpdateSet(s.id, 'weight_kg', e.target.value)}
                inputMode="decimal"
              />
              <input
                type="number"
                className="set-input"
                placeholder="0"
                min="0"
                value={s.reps}
                onChange={e => onUpdateSet(s.id, 'reps', e.target.value)}
                inputMode="numeric"
              />
              <button
                onClick={() => onRemoveSet(s.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {/* Add set */}
          <button
            className="btn btn-ghost btn-sm btn-full"
            style={{ marginTop: '10px', color: 'var(--accent)' }}
            onClick={onAddSet}
          >
            <Plus size={13} /> Add Set
          </button>
        </>
      )}
    </div>
  )
}

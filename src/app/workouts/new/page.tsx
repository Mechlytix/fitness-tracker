'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Trash2, Check, Search,
  ChevronDown, ChevronUp, Loader2, Save, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

type Exercise = { id: string; name: string; exercise_categories: { name: string } | null }

type SetRow = {
  id: string
  weight_kg: string
  reps: string
  completed: boolean
  targetWeight: string
  targetReps: string
}

type WorkoutExercise = {
  localId: string
  exercise: Exercise
  planExerciseId?: string
  sets: SetRow[]
}

function genId() { return Math.random().toString(36).slice(2) }

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><Loader2 size={28} className="animate-spin" color="var(--accent)" /></div>}>
      <NewWorkoutInner />
    </Suspense>
  )
}

function NewWorkoutInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planDayId = searchParams.get('planDayId')
  const supabase = createClient()

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)
  const [planDayName, setPlanDayName] = useState('')

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

  // Load plan day if planDayId is set
  const loadPlanDay = useCallback(async () => {
    if (!planDayId) return
    const { data } = await supabase
      .from('plan_days')
      .select(`
        day_name,
        plan_exercises (
          id, exercise_order, notes,
          exercises ( id, name, exercise_categories ( name ) ),
          plan_sets ( set_order, target_weight_kg, target_reps, notes )
        )
      `)
      .eq('id', planDayId)
      .single()

    if (data) {
      setPlanDayName(data.day_name)
      const planExercises = ((data.plan_exercises as any[]) ?? [])
        .sort((a: any, b: any) => a.exercise_order - b.exercise_order)

      setExercises(planExercises.map((pe: any) => ({
        localId: genId(),
        planExerciseId: pe.id,
        exercise: {
          id: pe.exercises?.id ?? '',
          name: pe.exercises?.name ?? 'Unknown',
          exercise_categories: pe.exercises?.exercise_categories ?? null,
        },
        sets: ((pe.plan_sets as any[]) ?? [])
          .sort((a: any, b: any) => a.set_order - b.set_order)
          .map((s: any) => ({
            id: genId(),
            weight_kg: s.target_weight_kg?.toString() ?? '',
            reps: '',
            completed: false,
            targetWeight: s.target_weight_kg?.toString() ?? '',
            targetReps: s.target_reps?.toString() ?? '',
          })),
      })))
    }
  }, [supabase, planDayId])

  useEffect(() => { loadExercises() }, [loadExercises])
  useEffect(() => { loadPlanDay() }, [loadPlanDay])
  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showPicker])

  function addExercise(ex: Exercise) {
    setExercises(prev => [...prev, {
      localId: genId(),
      exercise: ex,
      sets: [{ id: genId(), weight_kg: '', reps: '', completed: false, targetWeight: '', targetReps: '' }]
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
          reps: '',
          completed: false,
          targetWeight: lastSet?.targetWeight ?? '',
          targetReps: lastSet?.targetReps ?? '',
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

    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        workout_date: date,
        notes: notes || null,
        plan_day_id: planDayId || null,
      })
      .select('id')
      .single()

    if (wErr || !workout) { setError(wErr?.message ?? 'Failed to save'); setSaving(false); return }

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

    setSaving(false)

    if (planDayId) {
      setSavedWorkoutId(workout.id)
    } else {
      router.push(`/workouts/${workout.id}`)
    }
  }

  async function handleReview() {
    if (!savedWorkoutId || !planDayId) return
    setReviewing(true)
    try {
      const res = await fetch('/api/plan/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planDayId, workoutId: savedWorkoutId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Review failed')
      } else {
        setReviewResult(data)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setReviewing(false)
  }

  const filteredEx = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exSearch.toLowerCase())
  )

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const completedSets = exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0)
  const isPlanMode = !!planDayId

  // Post-save review UI
  if (savedWorkoutId && isPlanMode) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Check size={28} color="var(--green)" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>Workout Saved!</h2>
          <p className="text-secondary" style={{ marginBottom: '24px' }}>
            {planDayName} completed. Let the AI review and adjust your next session.
          </p>

          {!reviewResult && (
            <button className="btn btn-primary btn-lg" onClick={handleReview} disabled={reviewing} style={{ marginBottom: '16px' }}>
              {reviewing
                ? <><Loader2 size={16} className="animate-spin" /> Reviewing performance…</>
                : <><Sparkles size={16} /> Review & Adjust Next Session</>
              }
            </button>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {reviewResult && (
            <div style={{ textAlign: 'left', marginTop: '16px' }}>
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                {reviewResult.summary}
              </div>
              <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>Adjustments Made</h3>
              {(reviewResult.adjustments ?? []).map((adj: any, i: number) => (
                <div key={i} className="card" style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{adj.exercise_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{adj.feedback}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(adj.new_sets ?? []).map((s: any, si: number) => (
                      <span key={si} className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                        Set {si + 1}: {s.target_weight_kg}kg × {s.target_reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
            <Link href={`/workouts/${savedWorkoutId}`} className="btn btn-secondary">View Workout</Link>
            <Link href="/plans" className="btn btn-primary">Back to Plans</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={isPlanMode ? '/plans' : '/workouts'} className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>
            {isPlanMode ? planDayName || 'Plan Workout' : 'New Workout'}
          </h1>
          {totalSets > 0 && (
            <p className="text-sm text-secondary">{completedSets}/{totalSets} sets done</p>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || exercises.length === 0}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save</>}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Date & Notes */}
      <div className="card-elevated" style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ marginBottom: '12px' }}>
          <label className="input-label" htmlFor="workout-date">Date</label>
          <input id="workout-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="input-label" htmlFor="workout-notes">Notes (optional)</label>
          <input id="workout-notes" className="input" placeholder="How did it feel?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Exercises */}
      {exercises.map((we, exIdx) => (
        <ExerciseBlock
          key={we.localId}
          we={we}
          exIdx={exIdx}
          isPlanMode={isPlanMode}
          onRemove={() => removeExercise(we.localId)}
          onAddSet={() => addSet(we.localId)}
          onRemoveSet={(sId) => removeSet(we.localId, sId)}
          onUpdateSet={(sId, f, v) => updateSet(we.localId, sId, f, v)}
          onToggleComplete={(sId) => toggleComplete(we.localId, sId)}
        />
      ))}

      {/* Add Exercise */}
      <button className="btn btn-secondary btn-full" style={{ marginBottom: '24px', borderStyle: 'dashed' }} onClick={() => setShowPicker(true)}>
        <Plus size={16} /> Add Exercise
      </button>

      {/* Exercise Picker Modal */}
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
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}><Loader2 size={20} className="animate-spin" /></div>
            ) : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredEx.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No exercises found</p>
                ) : (
                  filteredEx.map(ex => (
                    <button key={ex.id} onClick={() => addExercise(ex)} style={{
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
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Exercise Block ──
type ExerciseBlockProps = {
  we: WorkoutExercise; exIdx: number; isPlanMode: boolean
  onRemove: () => void; onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onUpdateSet: (setId: string, field: keyof SetRow, value: string | boolean) => void
  onToggleComplete: (setId: string) => void
}

function ExerciseBlock({ we, exIdx, isPlanMode, onRemove, onAddSet, onRemoveSet, onUpdateSet, onToggleComplete }: ExerciseBlockProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="card-elevated" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: collapsed ? 0 : '12px' }}>
        <div style={{
          width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0
        }}>{exIdx + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{we.exercise.name}</div>
          {we.exercise.exercise_categories?.name && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{we.exercise.exercise_categories.name}</div>
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
          {isPlanMode ? (
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 12px 1fr 1fr 36px',
              gap: '4px', padding: '4px 0 8px',
              borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px'
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>#</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent)', textAlign: 'center' }}>Target kg</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent)', textAlign: 'center' }}>Target reps</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>→</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actual kg</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actual reps</div>
              <div />
            </div>
          ) : (
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
          )}

          {/* Sets */}
          {we.sets.map((s, sIdx) => {
            const metTarget = isPlanMode && s.reps && s.targetReps
              ? parseInt(s.reps) >= parseInt(s.targetReps) : false

            return isPlanMode ? (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 1fr 12px 1fr 1fr 36px',
                gap: '4px', alignItems: 'center', padding: '4px 0',
                opacity: s.completed ? 0.6 : 1
              }}>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => onToggleComplete(s.id)} style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: s.completed ? 'var(--green)' : 'var(--bg-primary)',
                    border: `1.5px solid ${s.completed ? 'var(--green)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', margin: '0 auto'
                  }}>
                    {s.completed ? <Check size={11} color="#fff" strokeWidth={3} />
                      : <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{sIdx + 1}</span>}
                  </button>
                </div>
                {/* Targets (read-only) */}
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {s.targetWeight || '—'}
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {s.targetReps || '—'}
                </div>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</div>
                {/* Actuals */}
                <input type="number" className="set-input" placeholder={s.targetWeight || '0'} min="0" step="0.5"
                  value={s.weight_kg} onChange={e => onUpdateSet(s.id, 'weight_kg', e.target.value)} inputMode="decimal"
                  style={{ fontSize: '0.8rem', padding: '6px 4px' }}
                />
                <input type="number" className="set-input" min="0"
                  placeholder={s.targetReps || '0'}
                  value={s.reps} onChange={e => onUpdateSet(s.id, 'reps', e.target.value)} inputMode="numeric"
                  style={{
                    fontSize: '0.8rem', padding: '6px 4px',
                    borderColor: s.reps ? (metTarget ? 'var(--green)' : 'var(--amber)') : 'var(--border)'
                  }}
                />
                <button onClick={() => onRemoveSet(s.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><Trash2 size={12} /></button>
              </div>
            ) : (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
                gap: '8px', alignItems: 'center', padding: '4px 0',
                opacity: s.completed ? 0.6 : 1
              }}>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => onToggleComplete(s.id)} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: s.completed ? 'var(--green)' : 'var(--bg-primary)',
                    border: `1.5px solid ${s.completed ? 'var(--green)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', margin: '0 auto'
                  }}>
                    {s.completed ? <Check size={12} color="#fff" strokeWidth={3} />
                      : <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{sIdx + 1}</span>}
                  </button>
                </div>
                <input type="number" className="set-input" placeholder="0" min="0" step="0.5"
                  value={s.weight_kg} onChange={e => onUpdateSet(s.id, 'weight_kg', e.target.value)} inputMode="decimal" />
                <input type="number" className="set-input" placeholder="0" min="0"
                  value={s.reps} onChange={e => onUpdateSet(s.id, 'reps', e.target.value)} inputMode="numeric" />
                <button onClick={() => onRemoveSet(s.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><Trash2 size={13} /></button>
              </div>
            )
          })}

          <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: '10px', color: 'var(--accent)' }} onClick={onAddSet}>
            <Plus size={13} /> Add Set
          </button>
        </>
      )}
    </div>
  )
}

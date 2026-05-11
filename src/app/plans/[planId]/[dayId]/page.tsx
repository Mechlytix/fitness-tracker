'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Dumbbell, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type PlanSet = {
  id: string
  set_order: number
  target_weight_kg: string
  target_reps: string
  notes: string | null
}

type PlanExercise = {
  id: string
  exercise_order: number
  notes: string | null
  exercise: { id: string; name: string; category: string | null }
  sets: PlanSet[]
}

export default function PlanDayDetailPage() {
  const params = useParams()
  const planId = params.planId as string
  const dayId = params.dayId as string
  const supabase = createClient()

  const [dayName, setDayName] = useState('')
  const [dayNotes, setDayNotes] = useState('')
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('plan_days')
      .select(`
        id, day_name, notes,
        plan_exercises (
          id, exercise_order, notes,
          exercises ( id, name, exercise_categories ( name ) ),
          plan_sets ( id, set_order, target_weight_kg, target_reps, notes )
        )
      `)
      .eq('id', dayId)
      .single()

    if (data) {
      setDayName(data.day_name)
      setDayNotes(data.notes ?? '')
      setExercises(
        ((data.plan_exercises as any[]) ?? [])
          .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
          .map((pe: any) => ({
            id: pe.id,
            exercise_order: pe.exercise_order,
            notes: pe.notes,
            exercise: {
              id: pe.exercises?.id ?? '',
              name: pe.exercises?.name ?? 'Unknown',
              category: pe.exercises?.exercise_categories?.name ?? null,
            },
            sets: ((pe.plan_sets as any[]) ?? [])
              .sort((a: any, b: any) => a.set_order - b.set_order)
              .map((s: any) => ({
                id: s.id,
                set_order: s.set_order,
                target_weight_kg: s.target_weight_kg?.toString() ?? '',
                target_reps: s.target_reps?.toString() ?? '',
                notes: s.notes,
              })),
          }))
      )
    }
    setLoading(false)
  }, [supabase, dayId])

  useEffect(() => { load() }, [load])

  function updateSet(exIdx: number, setIdx: number, field: string, value: string) {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s)
      }
    }))
    setSaved(false)
  }

  function addSet(exIdx: number) {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      const lastSet = ex.sets[ex.sets.length - 1]
      return {
        ...ex,
        sets: [...ex.sets, {
          id: `new-${Date.now()}`,
          set_order: ex.sets.length,
          target_weight_kg: lastSet?.target_weight_kg ?? '',
          target_reps: lastSet?.target_reps ?? '',
          notes: null,
        }]
      }
    }))
    setSaved(false)
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)

    // Update day notes
    await supabase.from('plan_days').update({ notes: dayNotes || null }).eq('id', dayId)

    // For each exercise, delete old sets and re-insert
    for (const ex of exercises) {
      await supabase.from('plan_sets').delete().eq('plan_exercise_id', ex.id)

      const newSets = ex.sets.map((s, i) => ({
        plan_exercise_id: ex.id,
        set_order: i,
        target_weight_kg: s.target_weight_kg ? parseFloat(s.target_weight_kg) : null,
        target_reps: s.target_reps ? parseInt(s.target_reps) : null,
        notes: s.notes,
      }))

      if (newSets.length > 0) {
        await supabase.from('plan_sets').insert(newSets)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={28} className="animate-spin" color="var(--accent)" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/plans" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{dayName}</h1>
          <p className="text-secondary text-sm">{exercises.length} exercises · Edit targets below</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : saved ? <><Save size={14} /> Saved!</>
            : <><Save size={14} /> Save</>}
        </button>
      </div>

      {/* Day notes */}
      <div className="input-group" style={{ marginBottom: '20px' }}>
        <label className="input-label">Session Notes</label>
        <input className="input" placeholder="Coach notes for this session…" value={dayNotes} onChange={e => setDayNotes(e.target.value)} />
      </div>

      {/* Exercises */}
      {exercises.map((ex, exIdx) => (
        <div key={ex.id} className="card-elevated" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: 32, height: 32, background: 'var(--accent-dim)',
              borderRadius: 'var(--radius-sm)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0
            }}>
              {exIdx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ex.exercise.name}</div>
              {ex.exercise.category && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ex.exercise.category}</div>
              )}
            </div>
            <span className="badge badge-muted">{ex.sets.length} sets</span>
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
            gap: '8px', padding: '4px 0 8px',
            borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>#</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Target kg</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Target reps</div>
            <div />
          </div>

          {ex.sets.map((s, sIdx) => (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 36px',
              gap: '8px', alignItems: 'center', padding: '4px 0'
            }}>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {sIdx + 1}
              </div>
              <input
                type="number"
                className="set-input"
                placeholder="0"
                min="0"
                step="0.5"
                value={s.target_weight_kg}
                onChange={e => updateSet(exIdx, sIdx, 'target_weight_kg', e.target.value)}
                inputMode="decimal"
              />
              <input
                type="number"
                className="set-input"
                placeholder="0"
                min="0"
                value={s.target_reps}
                onChange={e => updateSet(exIdx, sIdx, 'target_reps', e.target.value)}
                inputMode="numeric"
              />
              <button
                onClick={() => removeSet(exIdx, sIdx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button
            className="btn btn-ghost btn-sm btn-full"
            style={{ marginTop: '10px', color: 'var(--accent)' }}
            onClick={() => addSet(exIdx)}
          >
            <Plus size={13} /> Add Set
          </button>
        </div>
      ))}

      {/* Start Workout CTA */}
      <Link
        href={`/workouts/new?planDayId=${dayId}`}
        className="btn btn-primary btn-full btn-lg"
        style={{ marginTop: '8px' }}
      >
        <Dumbbell size={18} /> Start This Workout
      </Link>
    </div>
  )
}

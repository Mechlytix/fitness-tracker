'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trash2, Calendar, Dumbbell, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'

type SetWithExercise = {
  id: string
  weight_kg: number | null
  reps: number | null
  distance: number | null
  distance_unit: string | null
  time_seconds: number | null
  set_order: number
  notes: string | null
  exercises: { id: string; name: string; exercise_categories: { name: string } | null } | null
}

type GroupedExercise = {
  exercise: { id: string; name: string; category: string | null }
  sets: SetWithExercise[]
}

export default function WorkoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const workoutId = params.id as string

  const [workout, setWorkout] = useState<{ workout_date: string; notes: string | null } | null>(null)
  const [groups, setGroups] = useState<GroupedExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const [wRes, sRes] = await Promise.all([
      supabase.from('workouts').select('workout_date, notes').eq('id', workoutId).single(),
      supabase.from('workout_sets')
        .select('*, exercises(id, name, exercise_categories(name))')
        .eq('workout_id', workoutId)
        .order('set_order'),
    ])
    if (wRes.data) setWorkout(wRes.data)
    if (sRes.data) {
      const exerciseMap = new Map<string, GroupedExercise>()
      for (const s of sRes.data as SetWithExercise[]) {
        const exId = s.exercises?.id ?? 'unknown'
        if (!exerciseMap.has(exId)) {
          exerciseMap.set(exId, {
            exercise: {
              id: exId,
              name: s.exercises?.name ?? 'Unknown',
              category: s.exercises?.exercise_categories?.name ?? null
            },
            sets: []
          })
        }
        exerciseMap.get(exId)!.sets.push(s)
      }
      setGroups(Array.from(exerciseMap.values()))
    }
    setLoading(false)
  }, [supabase, workoutId])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!confirm('Delete this workout permanently?')) return
    setDeleting(true)
    await supabase.from('workout_sets').delete().eq('workout_id', workoutId)
    await supabase.from('workouts').delete().eq('id', workoutId)
    router.push('/workouts')
  }

  function formatWeight(kg: number | null) {
    if (kg === null) return '—'
    return `${kg} kg`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={28} className="animate-spin" color="var(--accent)" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="empty-state">
        <p className="empty-title">Workout not found</p>
        <Link href="/workouts" className="btn btn-secondary">Back to Workouts</Link>
      </div>
    )
  }

  const totalSets = groups.reduce((n, g) => n + g.sets.length, 0)
  const totalVolume = groups.reduce((n, g) =>
    n + g.sets.reduce((s, set) =>
      s + ((set.weight_kg ?? 0) * (set.reps ?? 0)), 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href="/workouts" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>
            {format(parseISO(workout.workout_date), 'EEEE, d MMMM yyyy')}
          </h1>
          <p className="text-secondary text-sm">
            {groups.length} exercises · {totalSets} sets
          </p>
        </div>
        <button
          className="btn btn-icon"
          style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-tile">
          <div className="stat-label">Exercises</div>
          <div className="stat-value" style={{ fontSize: '2rem' }}>{groups.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total Sets</div>
          <div className="stat-value" style={{ fontSize: '2rem' }}>{totalSets}</div>
        </div>
        <div className="stat-tile" style={{ gridColumn: 'span 2' }}>
          <div className="stat-label">Total Volume</div>
          <div className="stat-value" style={{ fontSize: '2rem' }}>
            {totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : '—'}
          </div>
        </div>
      </div>

      {workout.notes && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{workout.notes}</p>
        </div>
      )}

      {/* Exercise blocks */}
      {groups.map((group) => (
        <div key={group.exercise.id} className="card-elevated" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{
              width: 36, height: 36, background: 'var(--accent-dim)',
              borderRadius: 'var(--radius-sm)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Dumbbell size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {group.exercise.name}
              </div>
              {group.exercise.category && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {group.exercise.category}
                </div>
              )}
            </div>
            <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>
              {group.sets.length} sets
            </span>
          </div>

          {/* Set table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 1fr',
            gap: '8px', padding: '4px 0 8px',
            borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Set</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Weight</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Reps</div>
          </div>

          {group.sets.map((set, i) => (
            <div key={set.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr',
              gap: '8px', alignItems: 'center', padding: '6px 0',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                textAlign: 'center', fontSize: '0.75rem',
                color: 'var(--text-muted)', fontWeight: 600
              }}>
                {i + 1}
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatWeight(set.weight_kg)}
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                {set.reps ?? '—'}
              </div>
            </div>
          ))}

          {/* Best set */}
          {group.sets.length > 0 && (() => {
            const best = group.sets.reduce((b, s) =>
              ((s.weight_kg ?? 0) * (s.reps ?? 0)) > ((b.weight_kg ?? 0) * (b.reps ?? 0)) ? s : b)
            return best.weight_kg && best.reps ? (
              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <span className="badge badge-accent">
                  Best: {best.weight_kg}kg × {best.reps}
                </span>
              </div>
            ) : null
          })()}
        </div>
      ))}
    </div>
  )
}

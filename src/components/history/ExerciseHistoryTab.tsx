'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ChevronDown, ChevronUp, Trophy, Calendar, Dumbbell } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

type ExerciseSummary = {
  id: string
  name: string
  category: string | null
  sessionCount: number
  maxWeight: number | null
  lastPerformed: string | null
}

type SessionSet = {
  weight_kg: number | null
  reps: number | null
  set_order: number
}

type ExerciseSession = {
  workout_id: string
  workout_date: string
  sets: SessionSet[]
  topSet: SessionSet | null
}

// Epley formula for estimated 1RM
function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

function isPR(sets: SessionSet[], allSessions: ExerciseSession[], currentSessionDate: string): boolean {
  const maxCurrent = Math.max(...sets.map(s => s.weight_kg ?? 0))
  const previousMax = allSessions
    .filter(s => s.workout_date < currentSessionDate)
    .flatMap(s => s.sets)
    .reduce((max, s) => Math.max(max, s.weight_kg ?? 0), 0)
  return maxCurrent > previousMax && maxCurrent > 0
}

export function ExerciseHistoryTab() {
  const supabase = createClient()
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ExerciseSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const loadExercises = useCallback(async () => {
    setLoading(true)
    // Get all exercises the user has logged, with aggregate stats
    const { data: setsData } = await supabase
      .from('workout_sets')
      .select(`
        exercise_id,
        weight_kg,
        exercises ( id, name, exercise_categories ( name ) ),
        workouts!inner ( workout_date )
      `)
      .order('exercise_id')

    if (!setsData) { setLoading(false); return }

    // Aggregate per exercise
    const exMap = new Map<string, ExerciseSummary & { dates: Set<string> }>()
    for (const s of setsData as any[]) {
      const id = s.exercise_id
      const name = s.exercises?.name ?? 'Unknown'
      const category = s.exercises?.exercise_categories?.name ?? null
      const date = s.workouts?.workout_date ?? ''
      const weight = s.weight_kg ?? null

      if (!exMap.has(id)) {
        exMap.set(id, { id, name, category, sessionCount: 0, maxWeight: null, lastPerformed: null, dates: new Set() })
      }
      const entry = exMap.get(id)!
      entry.dates.add(date)
      if (weight !== null && (entry.maxWeight === null || weight > entry.maxWeight)) {
        entry.maxWeight = weight
      }
      if (!entry.lastPerformed || date > entry.lastPerformed) {
        entry.lastPerformed = date
      }
    }

    const result: ExerciseSummary[] = Array.from(exMap.values()).map(e => ({
      id: e.id, name: e.name, category: e.category,
      sessionCount: e.dates.size,
      maxWeight: e.maxWeight,
      lastPerformed: e.lastPerformed,
    })).sort((a, b) => (b.lastPerformed ?? '').localeCompare(a.lastPerformed ?? ''))

    setExercises(result)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadExercises() }, [loadExercises])

  async function handleExpand(exerciseId: string) {
    if (expandedId === exerciseId) {
      setExpandedId(null)
      return
    }
    setExpandedId(exerciseId)
    setSessionsLoading(true)

    const { data } = await supabase
      .from('workout_sets')
      .select(`
        weight_kg, reps, set_order,
        workouts!inner ( id, workout_date )
      `)
      .eq('exercise_id', exerciseId)
      .order('set_order')

    if (data) {
      // Group sets by workout
      const sessionMap = new Map<string, ExerciseSession>()
      for (const s of data as any[]) {
        const wid = s.workouts?.id
        const date = s.workouts?.workout_date ?? ''
        if (!sessionMap.has(wid)) {
          sessionMap.set(wid, { workout_id: wid, workout_date: date, sets: [], topSet: null })
        }
        const sess = sessionMap.get(wid)!
        const set: SessionSet = { weight_kg: s.weight_kg, reps: s.reps, set_order: s.set_order }
        sess.sets.push(set)
        // Track top set (by weight × reps volume)
        const vol = (s.weight_kg ?? 0) * (s.reps ?? 0)
        const currVol = (sess.topSet?.weight_kg ?? 0) * (sess.topSet?.reps ?? 0)
        if (vol > currVol) sess.topSet = set
      }

      const result = Array.from(sessionMap.values())
        .sort((a, b) => b.workout_date.localeCompare(a.workout_date))
      setSessions(result)
    }
    setSessionsLoading(false)
  }

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Dumbbell size={24} /></div>
        <p className="empty-title">No exercise history yet</p>
        <p className="empty-desc">Log some workouts to see per-exercise history and progress.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
        }} />
        <input
          type="search"
          className="input"
          placeholder="Search exercises…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '38px' }}
        />
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {filtered.length} exercise{filtered.length !== 1 ? 's' : ''} logged
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(ex => {
          const isExpanded = expandedId === ex.id
          const est1RM = ex.maxWeight ? estimate1RM(ex.maxWeight, 1) : null

          return (
            <div key={ex.id} className="card-elevated" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Exercise row */}
              <button
                onClick={() => handleExpand(ex.id)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  textAlign: 'left', color: 'inherit', fontFamily: 'inherit'
                }}
              >
                <div style={{
                  width: 40, height: 40, background: 'var(--accent-dim)',
                  borderRadius: 'var(--radius-sm)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Dumbbell size={16} color="var(--accent)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {ex.name}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {ex.maxWeight !== null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Trophy size={10} style={{ display: 'inline', marginRight: '3px', color: 'var(--amber)' }} />
                        {ex.maxWeight} kg PR
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ex.sessionCount} session{ex.sessionCount !== 1 ? 's' : ''}
                    </span>
                    {ex.lastPerformed && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Last: {format(parseISO(ex.lastPerformed), 'd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  {ex.maxWeight && (
                    <Link
                      href={`/exercises/${ex.id}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: '0.7rem', color: 'var(--accent)', padding: '3px 8px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)' }}
                    >
                      Details
                    </Link>
                  )}
                  {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </button>

              {/* Expanded session list */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {sessionsLoading ? (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '40px', borderRadius: 'var(--radius-sm)' }} />
                      ))}
                    </div>
                  ) : (
                    <div>
                      {sessions.map((sess, idx) => {
                        const hasPR = isPR(sess.sets, sessions, sess.workout_date)
                        const topWeight = Math.max(...sess.sets.map(s => s.weight_kg ?? 0))
                        return (
                          <div key={sess.workout_id} style={{
                            padding: '10px 16px',
                            borderBottom: idx < sessions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            display: 'flex', alignItems: 'center', gap: '12px'
                          }}>
                            <div style={{ width: 28, flexShrink: 0 }}>
                              <Calendar size={13} color="var(--text-muted)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {format(parseISO(sess.workout_date), 'd MMM yyyy')}
                                </span>
                                {hasPR && (
                                  <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                    🏆 PR
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {sess.sets.map((s, si) => (
                                  <span key={si} style={{
                                    fontSize: '0.72rem', color: 'var(--text-secondary)',
                                    background: 'var(--bg-primary)', padding: '2px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: s.weight_kg === topWeight ? 700 : 400,
                                    color: s.weight_kg === topWeight ? 'var(--text-primary)' : 'var(--text-secondary)'
                                  }}>
                                    {s.weight_kg ?? 'BW'}kg × {s.reps ?? '?'}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Link href={`/workouts/${sess.workout_id}`} style={{
                              fontSize: '0.7rem', color: 'var(--text-muted)',
                              flexShrink: 0, padding: '3px 6px'
                            }}>
                              View →
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

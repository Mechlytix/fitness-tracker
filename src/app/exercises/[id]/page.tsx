'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trophy, Calendar, Dumbbell, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ExerciseProgressChart } from '@/components/history/ExerciseProgressChart'

type SetRecord = {
  weight_kg: number | null
  reps: number | null
  set_order: number
}

type Session = {
  workout_id: string
  workout_date: string
  sets: SetRecord[]
  topSet: SetRecord | null
  volume: number
}

function estimate1RM(weight: number, reps: number) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export default function ExerciseDetailPage() {
  const params = useParams()
  const exerciseId = params.id as string
  const supabase = createClient()

  const [exerciseName, setExerciseName] = useState('')
  const [category, setCategory] = useState('')
  const [equipment, setEquipment] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [exRes, setsRes] = await Promise.all([
      supabase
        .from('exercises')
        .select('name, equipment, exercise_categories(name)')
        .eq('id', exerciseId)
        .single(),
      supabase
        .from('workout_sets')
        .select(`weight_kg, reps, set_order, workouts!inner(id, workout_date)`)
        .eq('exercise_id', exerciseId)
        .order('set_order'),
    ])

    if (exRes.data) {
      setExerciseName((exRes.data as any).name ?? '')
      setCategory((exRes.data as any).exercise_categories?.name ?? '')
      setEquipment((exRes.data as any).equipment ?? '')
    }

    if (setsRes.data) {
      const sessionMap = new Map<string, Session>()
      for (const s of setsRes.data as any[]) {
        const wid = s.workouts?.id
        const date = s.workouts?.workout_date ?? ''
        if (!sessionMap.has(wid)) {
          sessionMap.set(wid, { workout_id: wid, workout_date: date, sets: [], topSet: null, volume: 0 })
        }
        const sess = sessionMap.get(wid)!
        const set: SetRecord = { weight_kg: s.weight_kg, reps: s.reps, set_order: s.set_order }
        sess.sets.push(set)
        sess.volume += (s.weight_kg ?? 0) * (s.reps ?? 0)
        const vol = (s.weight_kg ?? 0) * (s.reps ?? 0)
        const currVol = (sess.topSet?.weight_kg ?? 0) * (sess.topSet?.reps ?? 0)
        if (vol > currVol) sess.topSet = set
      }
      setSessions(
        Array.from(sessionMap.values())
          .sort((a, b) => b.workout_date.localeCompare(a.workout_date))
      )
    }
    setLoading(false)
  }, [supabase, exerciseId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={28} className="animate-spin" color="var(--accent)" />
      </div>
    )
  }

  // Compute stats
  const allSets = sessions.flatMap(s => s.sets)
  const prSet = allSets.reduce<SetRecord | null>((best, s) => {
    if (!best) return s
    return (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best
  }, null)
  const prSession = sessions.find(s => s.sets.some(set => set.weight_kg === prSet?.weight_kg))
  const est1RM = prSet?.weight_kg && prSet.reps
    ? estimate1RM(prSet.weight_kg, prSet.reps)
    : null
  const totalSets = allSets.length
  const totalSessions = sessions.length
  const totalVolume = Math.round(sessions.reduce((n, s) => n + s.volume, 0))

  // Chart data — top set per session (chronological)
  const chartData = sessions
    .slice()
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
    .map(s => ({
      date: s.workout_date,
      weight: Math.max(...s.sets.map(set => set.weight_kg ?? 0)),
      reps: s.topSet?.reps ?? undefined,
    }))
    .filter(d => d.weight > 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/workouts?tab=exercises" className="btn btn-icon">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{exerciseName || 'Exercise'}</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {category && <span className="badge badge-muted">{category}</span>}
            {equipment && <span className="badge badge-muted">{equipment}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-tile">
          <div className="stat-label">PR Weight</div>
          <div className="stat-value">{prSet?.weight_kg ?? '—'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {prSet?.reps ? `× ${prSet.reps} reps` : 'kg'}
            {prSession && ` · ${format(parseISO(prSession.workout_date), 'd MMM yy')}`}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Est. 1RM</div>
          <div className="stat-value">{est1RM ?? '—'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg (Epley)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{totalSessions}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{totalSets} sets total</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total Volume</div>
          <div className="stat-value" style={{ fontSize: totalVolume > 999999 ? '1.25rem' : '1.75rem' }}>
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg lifted</div>
        </div>
      </div>

      {/* Strength chart */}
      <div className="chart-card" style={{ marginBottom: '24px' }}>
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <TrendingUp size={14} color="var(--accent)" />
          Strength Progression
        </div>
        <div className="chart-subtitle">Heaviest set per session</div>
        <ExerciseProgressChart data={chartData} height={220} />
      </div>

      {/* Session history */}
      <div style={{ marginBottom: '16px' }}>
        <div className="section-header">
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Session History</h2>
          <span className="badge badge-muted">{totalSessions} sessions</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sessions.map((sess) => {
          const sessionPR = sess.sets.some(s => s.weight_kg === prSet?.weight_kg)
          const topW = Math.max(...sess.sets.map(s => s.weight_kg ?? 0))

          return (
            <div key={sess.workout_id} className="card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {format(parseISO(sess.workout_date), 'EEEE, d MMM yyyy')}
                  </span>
                  {sessionPR && (
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      <Trophy size={9} style={{ display: 'inline', marginRight: '2px' }} />PR
                    </span>
                  )}
                </div>
                <Link href={`/workouts/${sess.workout_id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                  Full workout →
                </Link>
              </div>

              {/* Set grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 1fr 1fr',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '4px'
              }}>
                <div style={{ textAlign: 'center' }}>Set</div>
                <div style={{ textAlign: 'center' }}>Weight</div>
                <div style={{ textAlign: 'center' }}>Reps</div>
                <div style={{ textAlign: 'center' }}>Vol.</div>
              </div>

              {sess.sets.map((s, i) => {
                const isTop = s.weight_kg === topW && topW > 0
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 1fr 1fr',
                    gap: '6px',
                    padding: '5px 0',
                    borderBottom: i < sess.sets.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    fontSize: '0.8125rem',
                  }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</div>
                    <div style={{ textAlign: 'center', fontWeight: isTop ? 700 : 400, color: isTop ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {s.weight_kg ?? '—'} kg
                    </div>
                    <div style={{ textAlign: 'center', color: 'var(--text-primary)' }}>{s.reps ?? '—'}</div>
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {s.weight_kg && s.reps ? `${Math.round(s.weight_kg * s.reps)} kg` : '—'}
                    </div>
                  </div>
                )
              })}

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{sess.sets.length} sets</span>
                <span>Volume: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(sess.volume).toLocaleString()} kg</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

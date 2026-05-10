'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Trophy, BarChart2, Activity } from 'lucide-react'
import { format, parseISO, subMonths, subWeeks, startOfWeek } from 'date-fns'
import { ExerciseProgressChart } from '@/components/history/ExerciseProgressChart'
import { VolumeChart } from '@/components/history/VolumeChart'

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All'

type RawSet = {
  exercise_id: string
  exercise_name: string
  weight_kg: number | null
  reps: number | null
  workout_date: string
  workout_id: string
}

type PREntry = {
  exercise_id: string
  exerciseName: string
  maxWeight: number
  bestReps: number
  est1RM: number
  date: string
  isRecent: boolean
}

function estimate1RM(weight: number, reps: number) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

function getDateCutoff(range: TimeRange): Date | null {
  const now = new Date()
  switch (range) {
    case '1M': return subMonths(now, 1)
    case '3M': return subMonths(now, 3)
    case '6M': return subMonths(now, 6)
    case '1Y': return subMonths(now, 12)
    default: return null
  }
}

export function ProgressTab() {
  const supabase = createClient()
  const [rawSets, setRawSets] = useState<RawSet[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('3M')
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workout_sets')
      .select(`
        exercise_id,
        weight_kg,
        reps,
        exercises ( name ),
        workouts!inner ( id, workout_date )
      `)
      .not('weight_kg', 'is', null)
      .order('workouts(workout_date)', { ascending: true })

    if (data) {
      const sets: RawSet[] = (data as any[]).map(s => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercises?.name ?? 'Unknown',
        weight_kg: s.weight_kg,
        reps: s.reps,
        workout_date: s.workouts?.workout_date ?? '',
        workout_id: s.workouts?.id ?? '',
      }))
      setRawSets(sets)
      // Default: most-logged exercise
      if (sets.length > 0 && !selectedExercise) {
        const counts = new Map<string, number>()
        sets.forEach(s => counts.set(s.exercise_id, (counts.get(s.exercise_id) ?? 0) + 1))
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? sets[0].exercise_id
        setSelectedExercise(top)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Filter by time range
  const cutoff = useMemo(() => getDateCutoff(timeRange), [timeRange])
  const filteredSets = useMemo(() =>
    cutoff ? rawSets.filter(s => parseISO(s.workout_date) >= cutoff!) : rawSets,
    [rawSets, cutoff]
  )

  // Strength progression data for selected exercise
  const progressionData = useMemo(() => {
    if (!selectedExercise) return []
    const byDate = new Map<string, number>()
    filteredSets
      .filter(s => s.exercise_id === selectedExercise && s.weight_kg !== null)
      .forEach(s => {
        const w = s.weight_kg!
        const existing = byDate.get(s.workout_date) ?? 0
        if (w > existing) byDate.set(s.workout_date, w)
      })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weight]) => ({ date, weight }))
  }, [filteredSets, selectedExercise])

  // Weekly volume data
  const volumeData = useMemo(() => {
    const weekMap = new Map<string, { volume: number; sessions: Set<string> }>()
    filteredSets.forEach(s => {
      if (!s.weight_kg || !s.reps) return
      const weekStart = format(startOfWeek(parseISO(s.workout_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      if (!weekMap.has(weekStart)) weekMap.set(weekStart, { volume: 0, sessions: new Set() })
      const entry = weekMap.get(weekStart)!
      entry.volume += s.weight_kg * s.reps
      entry.sessions.add(s.workout_id)
    })
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, volume: Math.round(v.volume), sessions: v.sessions.size }))
  }, [filteredSets])

  // PR table
  const prTable = useMemo((): PREntry[] => {
    const exMap = new Map<string, PREntry>()
    const twoWeeksAgo = format(subWeeks(new Date(), 2), 'yyyy-MM-dd')

    rawSets.forEach(s => {
      if (!s.weight_kg || !s.reps) return
      const existing = exMap.get(s.exercise_id)
      const e1rm = estimate1RM(s.weight_kg, s.reps)
      if (!existing || s.weight_kg > existing.maxWeight) {
        exMap.set(s.exercise_id, {
          exercise_id: s.exercise_id,
          exerciseName: s.exercise_name,
          maxWeight: s.weight_kg,
          bestReps: s.reps,
          est1RM: e1rm,
          date: s.workout_date,
          isRecent: s.workout_date >= twoWeeksAgo,
        })
      }
    })
    return Array.from(exMap.values()).sort((a, b) => b.maxWeight - a.maxWeight)
  }, [rawSets])

  // Unique exercises for selector
  const uniqueExercises = useMemo(() => {
    const seen = new Map<string, string>()
    rawSets.forEach(s => seen.set(s.exercise_id, s.exercise_name))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [rawSets])

  // Summary stats
  const totalSessions = useMemo(() => new Set(filteredSets.map(s => s.workout_id)).size, [filteredSets])
  const totalVolume = useMemo(() => Math.round(filteredSets.reduce((n, s) => n + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)), [filteredSets])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    )
  }

  if (rawSets.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><TrendingUp size={24} /></div>
        <p className="empty-title">No data to chart yet</p>
        <p className="empty-desc">Log some workouts with weights and reps to see your progress charts.</p>
      </div>
    )
  }

  const selectedName = uniqueExercises.find(e => e.id === selectedExercise)?.name ?? ''

  return (
    <div>
      {/* Time range selector */}
      <div className="time-range-bar" style={{ marginBottom: '20px' }}>
        {(['1M', '3M', '6M', '1Y', 'All'] as TimeRange[]).map(r => (
          <button
            key={r}
            className={`time-range-btn ${timeRange === r ? 'active' : ''}`}
            onClick={() => setTimeRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-tile">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">{totalSessions}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>in period</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total Volume</div>
          <div className="stat-value" style={{ fontSize: totalVolume > 999999 ? '1.25rem' : '1.75rem' }}>
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg lifted</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="chart-grid">
        {/* Strength Progression */}
        <div className="chart-card" style={{ gridColumn: 'span 1' }}>
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={14} color="var(--accent)" />
            Strength Progression
          </div>
          <div style={{ marginBottom: '12px' }}>
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="input"
              style={{ fontSize: '0.8rem', padding: '6px 10px', marginTop: '8px' }}
            >
              {uniqueExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div className="chart-subtitle">
            Top set weight per session {selectedName ? `— ${selectedName}` : ''}
          </div>
          <ExerciseProgressChart data={progressionData} height={200} />
        </div>

        {/* Weekly Volume */}
        <div className="chart-card">
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={14} color="var(--accent)" />
            Weekly Volume
          </div>
          <div className="chart-subtitle">Total kg lifted per week (sets × reps × weight)</div>
          <VolumeChart data={volumeData} height={200} />
        </div>
      </div>

      {/* PR Table */}
      <div className="chart-card">
        <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Trophy size={14} color="var(--amber)" />
          Personal Records
          <span className="badge badge-muted" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
            {prTable.length} lifts tracked
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Best Weight</th>
                <th>Best Set</th>
                <th>Est. 1RM</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {prTable.map(pr => (
                <tr key={pr.exercise_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{pr.exerciseName}</span>
                      {pr.isRecent && (
                        <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>New PR!</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pr.maxWeight} kg</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {pr.maxWeight} kg × {pr.bestReps}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{pr.est1RM} kg</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {format(parseISO(pr.date), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

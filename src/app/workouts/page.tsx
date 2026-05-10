'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Dumbbell, Calendar, ChevronRight, List, TrendingUp, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ExerciseHistoryTab } from '@/components/history/ExerciseHistoryTab'
import { ProgressTab } from '@/components/history/ProgressTab'

type Tab = 'sessions' | 'exercises' | 'progress'

type WorkoutSummary = {
  id: string
  workout_date: string
  notes: string | null
  set_count: number
  exercise_count: number
}

function SessionsTab({ workouts, loading }: { workouts: WorkoutSummary[]; loading: boolean }) {
  // Group by month
  const grouped = workouts.reduce<Record<string, WorkoutSummary[]>>((acc, w) => {
    const month = format(parseISO(w.workout_date), 'MMMM yyyy')
    if (!acc[month]) acc[month] = []
    acc[month].push(w)
    return acc
  }, {})

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Calendar size={24} /></div>
        <p className="empty-title">No workouts yet</p>
        <p className="empty-desc">Start logging or import your FitNotes history.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Link href="/import" className="btn btn-secondary btn-sm">Import FitNotes</Link>
          <Link href="/workouts/new" className="btn btn-primary btn-sm">New Workout</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {Object.entries(grouped).map(([month, monthWorkouts]) => (
        <div key={month} style={{ marginBottom: '24px' }}>
          <div className="section-header" style={{ marginBottom: '10px' }}>
            <h3 className="section-title" style={{ fontSize: '0.75rem' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '6px' }} />
              {month}
            </h3>
            <span className="text-muted text-xs">{monthWorkouts.length} sessions</span>
          </div>
          {monthWorkouts.map(w => (
            <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                marginBottom: '8px', cursor: 'pointer'
              }}>
                <div style={{
                  width: 48, height: 48, background: 'var(--accent-dim)',
                  borderRadius: 'var(--radius-md)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Dumbbell size={20} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {format(parseISO(w.workout_date), 'EEEE, d MMM')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {w.exercise_count} exercise{w.exercise_count !== 1 ? 's' : ''} · {w.set_count} set{w.set_count !== 1 ? 's' : ''}
                  </div>
                  {w.notes && (
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {w.notes}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function WorkoutsPage() {
  const supabase = createClient()
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('sessions')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select(`id, workout_date, notes, workout_sets(id, exercise_id)`)
      .order('workout_date', { ascending: false })
      .limit(200)

    if (data) {
      setWorkouts(data.map(w => ({
        id: w.id,
        workout_date: w.workout_date,
        notes: w.notes,
        set_count: (w.workout_sets as { id: string; exercise_id: string }[]).length,
        exercise_count: new Set(
          (w.workout_sets as { id: string; exercise_id: string }[]).map(s => s.exercise_id)
        ).size,
      })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'sessions',  label: 'Sessions',  icon: List },
    { id: 'exercises', label: 'Exercises', icon: Dumbbell },
    { id: 'progress',  label: 'Progress',  icon: TrendingUp },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Workouts</h1>
          <p className="text-secondary text-sm">{workouts.length} sessions logged</p>
        </div>
        <Link href="/workouts/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> New
        </Link>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sessions'  && <SessionsTab workouts={workouts} loading={loading} />}
      {activeTab === 'exercises' && <ExerciseHistoryTab />}
      {activeTab === 'progress'  && <ProgressTab />}
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Sparkles, Loader2, Target, Calendar,
  Dumbbell, ChevronRight, Trash2, CheckCircle, Trophy
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Goal = {
  id: string
  goal_type: string
  title: string
  description: string | null
  target_value: number | null
  target_unit: string | null
  exercise_id: string | null
  exercises: { name: string } | null
  deadline: string | null
  is_achieved: boolean
}

type PlanDay = {
  id: string
  day_name: string
  day_order: number
  weekday: number | null
  notes: string | null
  exercise_count: number
}

type Plan = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  days: PlanDay[]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GOAL_TYPES = [
  { value: 'strength', label: '🏋️ Strength', desc: 'Lift heavier' },
  { value: 'hypertrophy', label: '💪 Hypertrophy', desc: 'Build muscle' },
  { value: 'endurance', label: '🏃 Endurance', desc: 'Last longer' },
  { value: 'weight_loss', label: '⚖️ Weight Loss', desc: 'Lose fat' },
  { value: 'general', label: '⚡ General', desc: 'Overall fitness' },
  { value: 'custom', label: '🎯 Custom', desc: 'Your own goal' },
]

export default function PlansPage() {
  const supabase = createClient()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [genError, setGenError] = useState('')

  // Generation form
  const [genGoal, setGenGoal] = useState('hypertrophy')
  const [genDays, setGenDays] = useState('4')
  const [genFocus, setGenFocus] = useState('')
  const [genEquipment, setGenEquipment] = useState('Full gym')

  // Goal form
  const [goalType, setGoalType] = useState('strength')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDesc, setGoalDesc] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalUnit, setGoalUnit] = useState('kg')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    // Load plans
    const { data: planData } = await supabase
      .from('workout_plans')
      .select(`
        id, name, description, is_active, created_at,
        plan_days ( id, day_name, day_order, weekday, notes,
          plan_exercises ( id )
        )
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })

    if (planData) {
      setPlans(planData.map((p: any) => ({
        ...p,
        days: (p.plan_days as any[])
          ?.sort((a: any, b: any) => a.day_order - b.day_order)
          .map((d: any) => ({
            ...d,
            exercise_count: (d.plan_exercises as any[])?.length ?? 0,
          })) ?? [],
      })))
    }

    // Load goals
    const goalsRes = await fetch('/api/goals')
    if (goalsRes.ok) {
      setGoals(await goalsRes.json())
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function handleGenerate() {
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: genGoal,
          daysPerWeek: parseInt(genDays),
          focusAreas: genFocus,
          equipment: genEquipment,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Failed to generate plan')
        setGenerating(false)
        return
      }
      setShowGenerate(false)
      loadData()
    } catch (err: any) {
      setGenError(err.message || 'Network error')
    }
    setGenerating(false)
  }

  async function handleAddGoal() {
    if (!goalTitle.trim()) return
    setSavingGoal(true)
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_type: goalType,
        title: goalTitle,
        description: goalDesc || null,
        target_value: goalTarget ? parseFloat(goalTarget) : null,
        target_unit: goalUnit || null,
        deadline: goalDeadline || null,
      }),
    })
    setGoalTitle('')
    setGoalDesc('')
    setGoalTarget('')
    setGoalDeadline('')
    setShowGoalForm(false)
    setSavingGoal(false)
    loadData()
  }

  async function handleDeleteGoal(id: string) {
    await fetch('/api/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadData()
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm('Delete this plan? This cannot be undone.')) return
    await supabase.from('workout_plans').delete().eq('id', planId)
    loadData()
  }

  const activePlan = plans.find(p => p.is_active)
  const inactivePlans = plans.filter(p => !p.is_active)
  const activeGoals = goals.filter(g => !g.is_achieved)

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>Plans</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Plans</h1>
          <p className="text-secondary text-sm">AI-powered workout programming</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowGenerate(true)}>
          <Sparkles size={14} /> Generate Plan
        </button>
      </div>

      {/* ─── Goals Section ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={14} /> Goals
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowGoalForm(true)}>
            <Plus size={14} /> Add
          </button>
        </div>

        {activeGoals.length === 0 && !showGoalForm ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ marginBottom: '8px' }}>
              <Target size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Set your goals so the AI can plan workouts around them
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowGoalForm(true)}>
              <Plus size={14} /> Add a goal
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeGoals.map(g => (
              <div key={g.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-dim)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Trophy size={16} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {g.title}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {g.target_value && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>
                        Target: {g.target_value} {g.target_unit ?? ''}
                      </span>
                    )}
                    {g.deadline && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        By {g.deadline}
                      </span>
                    )}
                    <span className="badge badge-muted" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {g.goal_type}
                    </span>
                  </div>
                  {g.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {g.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Active Plan ─── */}
      {activePlan ? (
        <div style={{ marginBottom: '28px' }}>
          <div className="section-header">
            <h2 className="section-title">Active Plan</h2>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeletePlan(activePlan.id)}>
              <Trash2 size={13} /> Remove
            </button>
          </div>
          <div className="card-elevated" style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{activePlan.name}</div>
            {activePlan.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                {activePlan.description}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {activePlan.days.map(day => (
                <Link key={day.id} href={`/plans/${activePlan.id}/${day.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'border-color var(--transition)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {day.day_name}
                      </span>
                      {day.weekday !== null && (
                        <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                          {WEEKDAYS[day.weekday]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {day.exercise_count} exercises
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/workouts/new?planDayId=${day.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '6px 10px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Dumbbell size={12} /> Start
                      </Link>
                      <span className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '6px 8px' }}>
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: '28px' }}>
          <div style={{ marginBottom: '12px' }}>
            <Sparkles size={28} color="var(--accent)" style={{ margin: '0 auto' }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>No active plan</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '280px', margin: '0 auto 16px' }}>
            Generate an AI-powered workout plan based on your goals and history.
          </p>
          <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>
            <Sparkles size={16} /> Generate Plan
          </button>
        </div>
      )}

      {/* Past plans */}
      {inactivePlans.length > 0 && (
        <div>
          <div className="section-header">
            <h2 className="section-title">Past Plans</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inactivePlans.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                <Calendar size={16} color="var(--text-muted)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {p.days.length} days · Created {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePlan(p.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Generate Modal ─── */}
      {showGenerate && (
        <div className="modal-overlay" onClick={() => !generating && setShowGenerate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '6px' }}>
              <Sparkles size={16} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent)' }} />
              Generate Workout Plan
            </h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
              AI will create a plan based on your goals, history, and PRs.
            </p>

            {genError && <div className="alert alert-error" style={{ marginBottom: '14px' }}>{genError}</div>}

            <div className="input-group">
              <label className="input-label">Goal</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {GOAL_TYPES.slice(0, 4).map(g => (
                  <button
                    key={g.value}
                    className={`badge ${genGoal === g.value ? 'badge-accent' : 'badge-muted'}`}
                    style={{ cursor: 'pointer', border: 'none', padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setGenGoal(g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="gen-days">Days per week</label>
              <input id="gen-days" type="number" className="input" min="2" max="6" value={genDays} onChange={e => setGenDays(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="gen-focus">Focus areas (optional)</label>
              <input id="gen-focus" className="input" placeholder="e.g., More chest and shoulders" value={genFocus} onChange={e => setGenFocus(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="gen-equip">Equipment</label>
              <input id="gen-equip" className="input" value={genEquipment} onChange={e => setGenEquipment(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating plan…</>
              ) : (
                <><Sparkles size={16} /> Generate</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Goal Form Modal ─── */}
      {showGoalForm && (
        <div className="modal-overlay" onClick={() => setShowGoalForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '20px' }}>
              <Target size={16} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent)' }} />
              Add Goal
            </h3>

            <div className="input-group">
              <label className="input-label">Type</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {GOAL_TYPES.map(g => (
                  <button
                    key={g.value}
                    className={`badge ${goalType === g.value ? 'badge-accent' : 'badge-muted'}`}
                    style={{ cursor: 'pointer', border: 'none', padding: '6px 10px', fontSize: '0.75rem' }}
                    onClick={() => setGoalType(g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="goal-title">Goal</label>
              <input id="goal-title" className="input" placeholder="e.g., Bench press 100kg" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="goal-desc">Details (optional)</label>
              <input id="goal-desc" className="input" placeholder="Any extra details..." value={goalDesc} onChange={e => setGoalDesc(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="goal-target">Target (optional)</label>
                <input id="goal-target" type="number" className="input" placeholder="e.g., 100" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="goal-unit">Unit</label>
                <input id="goal-unit" className="input" value={goalUnit} onChange={e => setGoalUnit(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="goal-deadline">Deadline (optional)</label>
              <input id="goal-deadline" type="date" className="input" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleAddGoal} disabled={savingGoal || !goalTitle.trim()}>
              {savingGoal ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Save Goal</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

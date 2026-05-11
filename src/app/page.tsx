'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Dumbbell, UtensilsCrossed, Sparkles, ArrowRight, Plus, Scale, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type TodayPlan = { day_name: string; exercises: string[] } | null

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [todayPlan, setTodayPlan] = useState<TodayPlan>(null)
  const [weekWorkouts, setWeekWorkouts] = useState(0)
  const [todayNutrition, setTodayNutrition] = useState({ cal: 0, p: 0, c: 0, f: 0 })
  const [targets, setTargets] = useState({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 })
  const [latestWeight, setLatestWeight] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = new Date().toISOString().slice(0, 10)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const dayOfWeek = (new Date().getDay() + 6) % 7 // Mon=0

      const [profileRes, planRes, workoutsRes, foodRes, targetsRes, weightRes] = await Promise.all([
        supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
        supabase.from('workout_plans').select(`plan_days(day_name, weekday, plan_exercises(exercises(name)))`).eq('user_id', user.id).eq('is_active', true).single(),
        supabase.from('workouts').select('id').eq('user_id', user.id).gte('workout_date', weekAgo),
        supabase.from('food_log').select('servings, food_items(calories, protein_g, carbs_g, fat_g)').eq('user_id', user.id).eq('log_date', today),
        supabase.from('nutrition_targets').select('*').eq('user_id', user.id).single(),
        supabase.from('weight_log').select('weight_kg').eq('user_id', user.id).order('log_date', { ascending: false }).limit(1),
      ])

      setProfile(profileRes.data)

      // Today's plan day
      if (planRes.data) {
        const days = (planRes.data as any).plan_days ?? []
        const todayDay = days.find((d: any) => d.weekday === dayOfWeek) || days[0]
        if (todayDay) {
          setTodayPlan({
            day_name: todayDay.day_name,
            exercises: (todayDay.plan_exercises ?? []).map((pe: any) => pe.exercises?.name).filter(Boolean),
          })
        }
      }

      setWeekWorkouts(workoutsRes.data?.length ?? 0)

      // Today's nutrition
      const food = foodRes.data ?? []
      const totals = food.reduce((acc: any, e: any) => {
        const fi = e.food_items as any
        const s = e.servings
        return { cal: acc.cal + (fi?.calories ?? 0) * s, p: acc.p + (fi?.protein_g ?? 0) * s, c: acc.c + (fi?.carbs_g ?? 0) * s, f: acc.f + (fi?.fat_g ?? 0) * s }
      }, { cal: 0, p: 0, c: 0, f: 0 })
      setTodayNutrition(totals)

      if (targetsRes.data) setTargets(targetsRes.data as any)
      if (weightRes.data?.length) setLatestWeight((weightRes.data[0] as any).weight_kg)

      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const calPct = Math.min((todayNutrition.cal / targets.calories) * 100, 100)
  const needsOnboarding = !loading && (!profile || !profile.onboarded)

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '20px' }}>
        <p className="text-secondary text-sm" style={{ marginBottom: '2px' }}>{today}</p>
        <h1 style={{ fontSize: '1.5rem' }}>{greeting} 👋</h1>
      </div>

      {/* Onboarding CTA */}
      {needsOnboarding && (
        <Link href="/onboarding" style={{ textDecoration: 'none' }}>
          <div className="card-elevated" style={{
            marginBottom: '20px', cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(156,107,255,0.05))',
            border: '1px solid rgba(108,99,255,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Sparkles size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>Set up your AI Coach</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Enter your stats and let AI create your workout plan, nutrition targets, and goals in one go.
                </div>
              </div>
              <ArrowRight size={18} color="var(--accent)" />
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-tile">
          <div className="stat-label">This Week</div>
          <div className="stat-value">{weekWorkouts}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>workouts</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Weight</div>
          <div className="stat-value">{latestWeight ?? '—'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Calories</div>
          <div className="stat-value">{Math.round(todayNutrition.cal)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>/ {targets.calories}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Protein</div>
          <div className="stat-value">{Math.round(todayNutrition.p)}g</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>/ {targets.protein_g}g</div>
        </div>
      </div>

      {/* Today's Workout */}
      {todayPlan && (
        <div style={{ marginBottom: '20px' }}>
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <h2 className="section-title">Today's Workout</h2>
          </div>
          <Link href="/workouts/new" style={{ textDecoration: 'none' }}>
            <div className="card-elevated" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Dumbbell size={20} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>{todayPlan.day_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {todayPlan.exercises.join(' · ')}
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Nutrition Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div className="section-header" style={{ marginBottom: '8px' }}>
          <h2 className="section-title">Nutrition Today</h2>
          <Link href="/nutrition" className="btn btn-ghost btn-sm">Details</Link>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle cx="28" cy="28" r="24" fill="none"
                  stroke={todayNutrition.cal > targets.calories ? 'var(--red)' : 'var(--accent)'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${calPct * 1.508} 150.8`}
                  transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray 0.5s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                {Math.round(calPct)}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>{Math.round(todayNutrition.cal)} kcal</span>
                <span style={{ color: 'var(--text-muted)' }}>{Math.round(targets.calories - todayNutrition.cal)} remaining</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: 'P', val: todayNutrition.p, tgt: targets.protein_g, color: 'var(--accent)' },
                  { label: 'C', val: todayNutrition.c, tgt: targets.carbs_g, color: 'var(--amber)' },
                  { label: 'F', val: todayNutrition.f, tgt: targets.fat_g, color: 'var(--green)' },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{m.label}: {Math.round(m.val)}/{m.tgt}g</div>
                    <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((m.val / m.tgt) * 100, 100)}%`, background: m.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-header" style={{ marginBottom: '8px' }}>
        <h2 className="section-title">Quick Actions</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <Link href="/workouts/new" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 8px', cursor: 'pointer' }}>
            <Dumbbell size={20} color="var(--accent)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Start Workout</div>
          </div>
        </Link>
        <Link href="/nutrition" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 8px', cursor: 'pointer' }}>
            <UtensilsCrossed size={20} color="var(--amber)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Log Food</div>
          </div>
        </Link>
        <Link href="/coach" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 8px', cursor: 'pointer' }}>
            <Sparkles size={20} color="var(--accent)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>AI Coach</div>
          </div>
        </Link>
        <Link href="/body" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 8px', cursor: 'pointer' }}>
            <Scale size={20} color="var(--green)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Log Weight</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const ACTIVITY_LEVELS = [
  { value: '1.2', label: 'Sedentary', desc: 'Office job, minimal exercise' },
  { value: '1.375', label: 'Light', desc: '1-3 days/week' },
  { value: '1.55', label: 'Moderate', desc: '3-5 days/week' },
  { value: '1.725', label: 'Active', desc: '6-7 days/week' },
  { value: '1.9', label: 'Very Active', desc: '2x/day or physical job' },
]

const GOALS = [
  { value: 'lose', emoji: '🔥', label: 'Lose Fat', desc: 'Caloric deficit with strength retention' },
  { value: 'maintain', emoji: '⚖️', label: 'Recomposition', desc: 'Build muscle while maintaining weight' },
  { value: 'gain', emoji: '💪', label: 'Build Muscle', desc: 'Caloric surplus for maximum growth' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Step 1: Body stats
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')

  // Step 2: Activity & goal
  const [activity, setActivity] = useState('1.55')
  const [goal, setGoal] = useState('maintain')

  // Step 3: Preferences
  const [daysPerWeek, setDaysPerWeek] = useState('4')
  const [equipment, setEquipment] = useState('Full gym (barbell, dumbbells, cables, machines)')
  const [focus, setFocus] = useState('')
  const [dietary, setDietary] = useState('')

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/coach/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: parseFloat(weight) || 80,
          height_cm: parseFloat(height) || 175,
          age: parseInt(age) || 30,
          sex,
          activity_level: parseFloat(activity),
          goal,
          days_per_week: parseInt(daysPerWeek),
          equipment,
          focus_areas: focus || null,
          dietary_notes: dietary || null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.program)
      setStep(4)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
    setLoading(false)
  }

  const canProceedStep0 = weight && height && age
  const canProceedStep1 = true
  const canProceedStep2 = true

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>

      {/* Step 0: Body Stats */}
      {step === 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Let's set you up</h1>
            <p className="text-secondary text-sm">Your AI coach needs a few details to create your program.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="input-group">
              <label className="input-label">Weight (kg)</label>
              <input className="input" type="number" placeholder="80" value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" />
            </div>
            <div className="input-group">
              <label className="input-label">Height (cm)</label>
              <input className="input" type="number" placeholder="180" value={height} onChange={e => setHeight(e.target.value)} inputMode="numeric" />
            </div>
            <div className="input-group">
              <label className="input-label">Age</label>
              <input className="input" type="number" placeholder="28" value={age} onChange={e => setAge(e.target.value)} inputMode="numeric" />
            </div>
            <div className="input-group">
              <label className="input-label">Sex</label>
              <select className="input" value={sex} onChange={e => setSex(e.target.value as 'male' | 'female')}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '20px' }}
            disabled={!canProceedStep0} onClick={() => setStep(1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Activity & Goal */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Activity & Goal</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>How active are you and what are you training for?</p>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="input-label">Activity Level</label>
            {ACTIVITY_LEVELS.map(a => (
              <button key={a.value} onClick={() => setActivity(a.value)}
                className={`card ${activity === a.value ? '' : ''}`}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: '6px',
                  cursor: 'pointer', border: activity === a.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: activity === a.value ? 'var(--accent-dim)' : 'var(--bg-card)',
                }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.desc}</div>
              </button>
            ))}
          </div>

          <div className="input-group">
            <label className="input-label">Primary Goal</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  style={{
                    flex: 1, padding: '14px 8px', textAlign: 'center', cursor: 'pointer',
                    borderRadius: 'var(--radius-md)',
                    border: goal === g.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: goal === g.value ? 'var(--accent-dim)' : 'var(--bg-card)',
                  }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{g.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{g.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => setStep(0)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(2)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Training Preferences */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Training Preferences</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>Help the AI build the right plan for you.</p>

          <div className="input-group">
            <label className="input-label">Days per week</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['3', '4', '5', '6'].map(d => (
                <button key={d} onClick={() => setDaysPerWeek(d)}
                  style={{
                    flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer',
                    fontWeight: 700, fontSize: '1rem', borderRadius: 'var(--radius-md)',
                    border: daysPerWeek === d ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: daysPerWeek === d ? 'var(--accent-dim)' : 'var(--bg-card)',
                    color: daysPerWeek === d ? 'var(--accent)' : 'var(--text-primary)',
                  }}>{d}</button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Equipment</label>
            <select className="input" value={equipment} onChange={e => setEquipment(e.target.value)}>
              <option>Full gym (barbell, dumbbells, cables, machines)</option>
              <option>Home gym (dumbbells, bench, pull-up bar)</option>
              <option>Minimal (dumbbells only)</option>
              <option>Bodyweight only</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Focus areas (optional)</label>
            <input className="input" placeholder="e.g., chest & shoulders, weak hamstrings…" value={focus} onChange={e => setFocus(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Dietary notes (optional)</label>
            <input className="input" placeholder="e.g., vegetarian, lactose intolerant…" value={dietary} onChange={e => setDietary(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(3)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Generate */}
      {step === 3 && !loading && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
              background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Ready to generate your program</h2>
            <p className="text-secondary text-sm">The AI will create your workout plan, nutrition targets, and training goals.</p>
          </div>

          <div className="card-elevated" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Weight:</span> <strong>{weight}kg</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Height:</span> <strong>{height}cm</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> <strong>{age}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Sex:</span> <strong>{sex}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Goal:</span> <strong>{GOALS.find(g => g.value === goal)?.label}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Days:</span> <strong>{daysPerWeek}/week</strong></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => setStep(2)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleGenerate}>
              <Sparkles size={16} /> Generate My Program
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {step === 3 && loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={40} className="animate-spin" color="var(--accent)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Building your program…</h2>
          <p className="text-secondary text-sm">The AI is analyzing your stats and creating a personalized workout plan, nutrition targets, and training goals.</p>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 10px',
              background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={24} color="var(--green)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Your program is ready!</h2>
          </div>

          {result.summary && (
            <div className="card-elevated" style={{ marginBottom: '16px' }}>
              <ReactMarkdown>{result.summary}</ReactMarkdown>
            </div>
          )}

          {/* Plan overview */}
          <div className="card" style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>🏋️ {result.plan?.name}</div>
            {result.plan?.days?.map((d: any, i: number) => (
              <div key={i} style={{ padding: '4px 0', fontSize: '0.8rem', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <strong>{d.day_name}</strong>: {d.exercises?.map((e: any) => e.exercise_name).join(', ')}
              </div>
            ))}
          </div>

          {/* Nutrition */}
          {result.nutrition && (
            <div className="card" style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>🍽️ Nutrition Targets</div>
              <div className="stat-grid">
                <div className="stat-tile"><div className="stat-label">Calories</div><div className="stat-value">{result.nutrition.calories}</div></div>
                <div className="stat-tile"><div className="stat-label">Protein</div><div className="stat-value">{result.nutrition.protein_g}g</div></div>
                <div className="stat-tile"><div className="stat-label">Carbs</div><div className="stat-value">{result.nutrition.carbs_g}g</div></div>
                <div className="stat-tile"><div className="stat-label">Fat</div><div className="stat-value">{result.nutrition.fat_g}g</div></div>
              </div>
              {result.nutrition.reasoning && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{result.nutrition.reasoning}</p>
              )}
            </div>
          )}

          {/* Goals */}
          {result.goals?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>🎯 Training Goals</div>
              {result.goals.map((g: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', fontSize: '0.8rem' }}>
                  • {g.title}{g.target_value ? ` — ${g.target_value}${g.target_unit ?? ''}` : ''}
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push('/')}>
            Let's Go 🚀
          </button>
        </div>
      )}
    </div>
  )
}

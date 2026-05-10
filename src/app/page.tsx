import { Dumbbell, Scale, Utensils, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <p className="text-secondary text-sm" style={{ marginBottom: '4px' }}>{today}</p>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Good evening 👋</h1>
        <p className="text-secondary">Ready to train?</p>
      </div>

      {/* Quick Stats */}
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">This Week</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>workouts</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Body Weight</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Calories Today</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kcal</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Protein Today</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>g</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-header">
        <h2 className="section-title">Quick Actions</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <Link href="/workouts/new" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(108,99,255,0.05))',
            borderColor: 'rgba(108,99,255,0.3)',
            cursor: 'pointer'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <Dumbbell size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Start Workout
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Log a new session
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
        </Link>

        <Link href="/body" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'var(--green-dim)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <Scale size={22} color="var(--green)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Body Measurements
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Weight, fat %, muscle mass
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
        </Link>

        <Link href="/nutrition" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'var(--amber-dim)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <Utensils size={22} color="var(--amber)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Log Food
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Track macros and calories
              </div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </div>
        </Link>
      </div>

      {/* Recent Workouts placeholder */}
      <div className="section-header">
        <h2 className="section-title">Recent Workouts</h2>
        <Link href="/workouts" className="btn btn-ghost btn-sm">See all</Link>
      </div>

      <div className="card">
        <div className="empty-state" style={{ padding: '32px 16px' }}>
          <div className="empty-icon">
            <Calendar size={24} />
          </div>
          <p className="empty-title">No workouts yet</p>
          <p className="empty-desc">Import your FitNotes history or start logging workouts.</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/import" className="btn btn-primary btn-sm">Import FitNotes</Link>
            <Link href="/workouts/new" className="btn btn-secondary btn-sm">New Workout</Link>
          </div>
        </div>
      </div>

      {/* AI Coach Teaser */}
      <div style={{ marginTop: '24px' }}>
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(156,107,255,0.04))',
          borderColor: 'rgba(108,99,255,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>AI Coach</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by your data</div>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
            Log some workouts first and your AI coach will analyse your progress, spot patterns, and suggest your next session.
          </p>
          <Link href="/coach" className="btn btn-primary btn-sm">Open Coach</Link>
        </div>
      </div>
    </div>
  )
}

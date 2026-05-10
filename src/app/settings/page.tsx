'use client'

import { Settings, Info, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Settings</h1>
        <p className="text-secondary text-sm">Preferences and integrations</p>
      </div>

      <div className="card-elevated" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Preferences
        </h3>
        {[
          { label: 'Weight Unit', value: 'Kilograms (kg)' },
          { label: 'Distance Unit', value: 'Kilometres (km)' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{value} <ChevronRight size={12} /></span>
          </div>
        ))}
      </div>

      <div className="card-elevated" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Integrations
        </h3>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Withings Scale</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coming in Phase 3</div>
          </div>
          <span className="badge badge-muted">Soon</span>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Info size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This is your personal FitTrack instance. Data is stored securely in your private Supabase project.
          </p>
        </div>
      </div>
    </div>
  )
}

import { Scale, Link2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function BodyPage() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Body</h1>
        <p className="text-secondary text-sm">Track weight, body composition</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-tile">
          <div className="stat-label">Weight</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Body Fat</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>%</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Muscle Mass</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Bone Mass</div>
          <div className="stat-value">—</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>kg</div>
        </div>
      </div>

      {/* Withings connect */}
      <div className="glass-card" style={{
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))',
        borderColor: 'rgba(34,197,94,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: 36, height: 36, background: 'var(--green-dim)',
            borderRadius: 'var(--radius-sm)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Scale size={18} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              Withings Scale
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Not connected
            </div>
          </div>
          <span className="badge badge-muted" style={{ marginLeft: 'auto' }}>Phase 3</span>
        </div>
        <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '14px', lineHeight: 1.6 }}>
          Connect your Withings smart scale to automatically sync body composition data.
        </p>
        <Link href="/settings" className="btn btn-secondary btn-sm">
          <Link2 size={14} /> Connect in Settings
        </Link>
      </div>

      {/* Chart placeholder */}
      <div className="section-header">
        <h2 className="section-title">Weight Trend</h2>
      </div>
      <div className="card" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <div className="empty-icon" style={{ margin: '0 auto 12px' }}>
          <TrendingUp size={24} />
        </div>
        <p className="empty-title">No data yet</p>
        <p className="empty-desc">Connect your Withings scale or add measurements manually.</p>
      </div>
    </div>
  )
}

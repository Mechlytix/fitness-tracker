import {
  Upload, Dumbbell, Settings, User,
  ChevronRight, Moon, HelpCircle
} from 'lucide-react'
import Link from 'next/link'

const MORE_ITEMS = [
  { icon: Upload,   label: 'Import FitNotes',    href: '/import',    desc: 'Import your CSV history' },
  { icon: Dumbbell, label: 'Exercise Library',    href: '/exercises', desc: 'Browse and manage exercises' },
  { icon: User,     label: 'Profile',             href: '/settings',  desc: 'Name, units, preferences' },
  { icon: Settings, label: 'Settings',            href: '/settings',  desc: 'App configuration' },
]

export default function MorePage() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>More</h1>
        <p className="text-secondary text-sm">Tools and settings</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MORE_ITEMS.map(({ icon: Icon, label, href, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer'
            }}>
              <div style={{
                width: 40, height: 40, background: 'var(--accent-dim)',
                borderRadius: 'var(--radius-sm)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {desc}
                </div>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p className="text-xs text-muted">FitTrack v0.1.0 — Personal Edition</p>
        <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Built with ❤️ for your gains</p>
      </div>
    </div>
  )
}

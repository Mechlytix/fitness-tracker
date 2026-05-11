'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, Dumbbell, UtensilsCrossed, Sparkles,
  ClipboardList, Zap, TrendingUp, Upload, Settings, Scale
} from 'lucide-react'

const PRIMARY_NAV = [
  { href: '/',           icon: Activity,         label: 'Dashboard' },
  { href: '/coach',      icon: Sparkles,         label: 'AI Coach' },
  { href: '/workouts',   icon: Dumbbell,         label: 'Train' },
  { href: '/nutrition',  icon: UtensilsCrossed,  label: 'Eat' },
]

const PLANNING_NAV = [
  { href: '/plans',      icon: ClipboardList,    label: 'Plans' },
  { href: '/body',       icon: Scale,            label: 'Body & Weight' },
]

const MORE_NAV = [
  { href: '/exercises',  icon: Dumbbell,         label: 'Exercises' },
  { href: '/import',     icon: Upload,           label: 'Import' },
  { href: '/settings',   icon: Settings,         label: 'Settings' },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '4px 12px', marginBottom: '20px'
      }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, var(--accent), #9c6bff)',
          borderRadius: 'var(--radius-sm)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Zap size={14} color="#fff" fill="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
          FitTrack
        </span>
      </div>

      {/* Primary Nav */}
      <div className="sidebar-section-label">Main</div>
      {PRIMARY_NAV.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} className={`sidebar-nav-item ${isActive(href) ? 'active' : ''}`}>
          <span className="sidebar-nav-icon"><Icon size={16} strokeWidth={2} /></span>
          {label}
        </Link>
      ))}

      <div className="sidebar-divider" />

      <div className="sidebar-section-label">Planning</div>
      {PLANNING_NAV.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} className={`sidebar-nav-item ${isActive(href) ? 'active' : ''}`}>
          <span className="sidebar-nav-icon"><Icon size={16} strokeWidth={2} /></span>
          {label}
        </Link>
      ))}

      <div className="sidebar-divider" />

      {/* More Nav */}
      <div className="sidebar-section-label">More</div>
      {MORE_NAV.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} className={`sidebar-nav-item ${isActive(href) ? 'active' : ''}`}>
          <span className="sidebar-nav-icon"><Icon size={16} strokeWidth={2} /></span>
          {label}
        </Link>
      ))}
    </aside>
  )
}

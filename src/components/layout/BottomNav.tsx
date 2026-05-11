'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, UtensilsCrossed, Activity, MessageSquare, ClipboardList } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',           icon: Activity,         label: 'Dashboard' },
  { href: '/plans',      icon: ClipboardList,    label: 'Plans' },
  { href: '/workouts',   icon: Dumbbell,         label: 'Workouts' },
  { href: '/coach',      icon: MessageSquare,    label: 'Coach' },
  { href: '/nutrition',  icon: UtensilsCrossed,  label: 'Nutrition' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, UtensilsCrossed, Activity, MessageSquare, MoreHorizontal } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',           icon: Activity,         label: 'Dashboard' },
  { href: '/workouts',   icon: Dumbbell,         label: 'Workouts' },
  { href: '/nutrition',  icon: UtensilsCrossed,  label: 'Nutrition' },
  { href: '/coach',      icon: MessageSquare,    label: 'Coach' },
  { href: '/more',       icon: MoreHorizontal,   label: 'More' },
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

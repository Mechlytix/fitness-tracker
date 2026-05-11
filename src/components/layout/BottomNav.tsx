'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Sparkles, Dumbbell, UtensilsCrossed, MoreHorizontal } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',           icon: Activity,         label: 'Dashboard' },
  { href: '/coach',      icon: Sparkles,         label: 'Coach' },
  { href: '/workouts',   icon: Dumbbell,         label: 'Train' },
  { href: '/nutrition',  icon: UtensilsCrossed,  label: 'Eat' },
  { href: '/more',       icon: MoreHorizontal,   label: 'More' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === '/'
          ? pathname === '/'
          : href === '/more'
            ? ['/more', '/plans', '/exercises', '/body', '/import', '/settings'].some(p => pathname.startsWith(p))
            : pathname.startsWith(href)
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

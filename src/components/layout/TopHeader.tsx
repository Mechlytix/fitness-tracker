'use client'

import Link from 'next/link'
import { Zap, Bell } from 'lucide-react'

export function TopHeader() {
  return (
    <header className="top-header">
      <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="logo-icon">
          <Zap size={16} color="#fff" fill="#fff" />
        </div>
        FitTrack
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="btn-icon" aria-label="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}

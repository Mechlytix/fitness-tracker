import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopHeader } from '@/components/layout/TopHeader'

export const metadata: Metadata = {
  title: 'FitTrack — Personal Fitness',
  description: 'Track workouts, nutrition and body composition with AI coaching.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0d0f12',
  initialScale: 1,
  width: 'device-width',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <TopHeader />
          <main className="page-content">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, ChevronRight, Loader2, Dumbbell } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Exercise = Database['public']['Tables']['exercises']['Row'] & {
  exercise_categories: { name: string } | null
}

const CATEGORY_ICONS: Record<string, string> = {
  'Chest': '💪', 'Back': '🏋️', 'Shoulders': '🤸',
  'Arms': '💪', 'Legs': '🦵', 'Core': '🎯',
  'Cardio': '🏃', 'Olympic': '🥇', 'Other': '⚡',
}

export default function ExercisesPage() {
  const supabase = createClient()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [exQuery, catQuery] = await Promise.all([
      supabase
        .from('exercises')
        .select('*, exercise_categories(name)')
        .order('name'),
      supabase.from('exercise_categories').select('*').order('name'),
    ])
    if (exQuery.data)  setExercises(exQuery.data as Exercise[])
    if (catQuery.data) setCategories(catQuery.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !activeCategory || ex.category_id === activeCategory
    return matchSearch && matchCat
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.exercise_categories?.name ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Exercises</h1>
          <p className="text-secondary text-sm">{exercises.length} exercises in library</p>
        </div>
        <Link href="/exercises/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> Add
        </Link>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)'
        }} />
        <input
          type="search"
          className="input"
          placeholder="Search exercises…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '38px' }}
        />
      </div>

      {/* Category filter pills */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px',
        marginBottom: '20px', scrollbarWidth: 'none'
      }}>
        <button
          className={`badge ${!activeCategory ? 'badge-accent' : 'badge-muted'}`}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', padding: '6px 12px', border: 'none' }}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`badge ${activeCategory === cat.id ? 'badge-accent' : 'badge-muted'}`}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap', padding: '6px 12px', border: 'none' }}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
          >
            {CATEGORY_ICONS[cat.name] ?? '⚡'} {cat.name}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '68px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Dumbbell size={24} /></div>
          <p className="empty-title">No exercises found</p>
          <p className="empty-desc">
            {exercises.length === 0
              ? 'Import your FitNotes CSV to populate your library, or add exercises manually.'
              : 'Try a different search or category.'}
          </p>
          {exercises.length === 0 && (
            <Link href="/import" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
              Import FitNotes
            </Link>
          )}
        </div>
      ) : (
        <div>
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, exList]) => (
            <div key={category} style={{ marginBottom: '24px' }}>
              <div className="section-header" style={{ marginBottom: '10px' }}>
                <h3 className="section-title" style={{ fontSize: '0.75rem' }}>
                  {CATEGORY_ICONS[category] ?? '⚡'} {category} ({exList.length})
                </h3>
              </div>
              {exList.map(ex => (
                <Link key={ex.id} href={`/exercises/${ex.id}`} style={{ textDecoration: 'none' }}>
                  <div className="exercise-row">
                    <div className="exercise-icon" style={{ fontSize: '1.1rem' }}>
                      {(CATEGORY_ICONS[category] ?? '⚡')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {ex.name}
                      </div>
                      {ex.equipment && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {ex.equipment}
                        </div>
                      )}
                    </div>
                    {ex.is_custom && (
                      <span className="badge badge-accent" style={{ flexShrink: 0 }}>Custom</span>
                    )}
                    <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

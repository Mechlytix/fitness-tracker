'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react'

type Exercise = { id: string; name: string; exercise_categories: { name: string } | null }

const CATEGORY_ICONS: Record<string, string> = {
  'Chest': '🫁', 'Back': '🔙', 'Shoulders': '🏋️', 'Arms': '💪',
  'Biceps': '💪', 'Triceps': '💪', 'Legs': '🦵', 'Quadriceps': '🦵',
  'Hamstrings': '🦵', 'Glutes': '🍑', 'Core': '🎯', 'Abs': '🎯',
  'Calves': '🦶', 'Forearms': '🤛', 'Cardio': '❤️', 'Full Body': '🏃',
  'Other': '🔘',
}

function getIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? '🏋️'
}

type Props = {
  exercises: Exercise[]
  loading: boolean
  onSelect: (ex: Exercise) => void
  searchRef?: React.RefObject<HTMLInputElement | null>
}

export function GroupedExercisePicker({ exercises, loading, onSelect, searchRef }: Props) {
  const [query, setQuery] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const filtered = useMemo(() =>
    exercises.filter(ex => ex.name.toLowerCase().includes(query.toLowerCase())),
    [exercises, query]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>()
    filtered.forEach(ex => {
      const cat = ex.exercise_categories?.name ?? 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(ex)
    })
    // Sort categories alphabetically, but put "Other" last
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Other') return 1
      if (b[0] === 'Other') return -1
      return a[0].localeCompare(b[0])
    })
  }, [filtered])

  // If searching, expand all. Auto-expand if only 1 category.
  const isSearching = query.length > 0
  const autoExpand = grouped.length <= 2

  function toggle(cat: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const isExpanded = (cat: string) => isSearching || autoExpand || expandedCats.has(cat)

  return (
    <>
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          ref={searchRef}
          className="input"
          placeholder="Search exercises…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {grouped.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>No exercises found</p>
          ) : grouped.map(([cat, exs]) => (
            <div key={cat} style={{ marginBottom: '4px' }}>
              {/* Category header */}
              <button
                onClick={() => toggle(cat)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', background: 'var(--bg-secondary)', border: 'none',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                  marginBottom: '2px',
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>{getIcon(cat)}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                  {cat}
                </span>
                <span className="badge badge-muted" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{exs.length}</span>
                {isExpanded(cat)
                  ? <ChevronDown size={14} color="var(--text-muted)" />
                  : <ChevronRight size={14} color="var(--text-muted)" />}
              </button>
              {/* Exercises */}
              {isExpanded(cat) && (
                <div style={{ paddingLeft: '6px' }}>
                  {exs.map(ex => (
                    <button key={ex.id} onClick={() => onSelect(ex)} style={{
                      width: '100%', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{ex.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

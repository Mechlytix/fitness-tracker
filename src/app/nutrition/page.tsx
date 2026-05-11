'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, Search, Loader2, Settings, X } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'

type FoodItem = {
  id: string; name: string; brand: string | null
  serving_size: number; serving_unit: string
  calories: number; protein_g: number; carbs_g: number; fat_g: number
}
type LogEntry = {
  id: string; meal_type: string; servings: number
  food_items: FoodItem
}
type Targets = { calories: number; protein_g: number; carbs_g: number; fat_g: number }
type SearchResult = FoodItem & { barcode?: string }

const MEALS = [
  { key: 'breakfast', label: '☀️ Breakfast' },
  { key: 'lunch', label: '🥗 Lunch' },
  { key: 'dinner', label: '🍽️ Dinner' },
  { key: 'snacks', label: '🍎 Snacks' },
]

export default function NutritionPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [log, setLog] = useState<LogEntry[]>([])
  const [targets, setTargets] = useState<Targets>({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 })
  const [loading, setLoading] = useState(true)

  // Picker state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMeal, setPickerMeal] = useState('snacks')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [myFoods, setMyFoods] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [servings, setServings] = useState('1')
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'search' | 'my' | 'custom'>('search')
  const searchRef = useRef<HTMLInputElement>(null)

  // Custom food form
  const [cfName, setCfName] = useState('')
  const [cfBrand, setCfBrand] = useState('')
  const [cfServing, setCfServing] = useState('100')
  const [cfUnit, setCfUnit] = useState('g')
  const [cfCal, setCfCal] = useState('')
  const [cfP, setCfP] = useState('')
  const [cfC, setCfC] = useState('')
  const [cfF, setCfF] = useState('')

  // Targets modal
  const [showTargets, setShowTargets] = useState(false)
  const [tCal, setTCal] = useState('')
  const [tP, setTP] = useState('')
  const [tC, setTC] = useState('')
  const [tF, setTF] = useState('')

  const loadDay = useCallback(async () => {
    setLoading(true)
    const [logRes, targetRes] = await Promise.all([
      fetch(`/api/food/log?date=${date}`),
      fetch('/api/food/targets'),
    ])
    if (logRes.ok) setLog(await logRes.json())
    if (targetRes.ok) {
      const t = await targetRes.json()
      setTargets(t)
      setTCal(t.calories?.toString() ?? '2000')
      setTP(t.protein_g?.toString() ?? '150')
      setTC(t.carbs_g?.toString() ?? '250')
      setTF(t.fat_g?.toString() ?? '65')
    }
    setLoading(false)
  }, [date])

  useEffect(() => { loadDay() }, [loadDay])

  // Totals
  const totals = log.reduce((acc, e) => {
    const s = e.servings
    const f = e.food_items
    return {
      calories: acc.calories + (f.calories * s),
      protein: acc.protein + (f.protein_g * s),
      carbs: acc.carbs + (f.carbs_g * s),
      fat: acc.fat + (f.fat_g * s),
    }
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  // Search Open Food Facts
  const searchTimer = useRef<any>(null)
  function handleSearch(q: string) {
    setSearchQuery(q)
    clearTimeout(searchTimer.current)
    if (q.length < 2) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setSearchResults(await res.json())
      setSearching(false)
    }, 400)
  }

  async function loadMyFoods() {
    const res = await fetch('/api/food')
    if (res.ok) setMyFoods(await res.json())
  }

  function openPicker(meal: string) {
    setPickerMeal(meal)
    setShowPicker(true)
    setSelectedFood(null)
    setServings('1')
    setSearchQuery('')
    setSearchResults([])
    setTab('search')
    loadMyFoods()
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  async function handleLog() {
    if (!selectedFood) return
    setSaving(true)

    // If it's from OFF (no id), save to food_items first
    let foodId = (selectedFood as any).id
    if (!foodId) {
      const res = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedFood),
      })
      const data = await res.json()
      foodId = data.id
    }

    await fetch('/api/food/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_item_id: foodId,
        log_date: date,
        meal_type: pickerMeal,
        servings: parseFloat(servings) || 1,
      }),
    })
    setSaving(false)
    setShowPicker(false)
    loadDay()
  }

  async function handleCustomFood() {
    if (!cfName.trim()) return
    setSaving(true)
    const res = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cfName, brand: cfBrand || null,
        serving_size: parseFloat(cfServing) || 100, serving_unit: cfUnit,
        calories: parseFloat(cfCal) || 0, protein_g: parseFloat(cfP) || 0,
        carbs_g: parseFloat(cfC) || 0, fat_g: parseFloat(cfF) || 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      await fetch('/api/food/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: data.id, log_date: date, meal_type: pickerMeal, servings: 1,
        }),
      })
    }
    setSaving(false)
    setShowPicker(false)
    setCfName(''); setCfBrand(''); setCfCal(''); setCfP(''); setCfC(''); setCfF('')
    loadDay()
  }

  async function handleDelete(id: string) {
    await fetch('/api/food/log', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadDay()
  }

  async function saveTargets() {
    await fetch('/api/food/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calories: parseFloat(tCal) || 2000, protein_g: parseFloat(tP) || 150,
        carbs_g: parseFloat(tC) || 250, fat_g: parseFloat(tF) || 65,
      }),
    })
    setShowTargets(false)
    loadDay()
  }

  const isToday = date === format(new Date(), 'yyyy-MM-dd')
  const calPct = Math.min((totals.calories / targets.calories) * 100, 100)

  function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
    const pct = Math.min((value / target) * 100, 100)
    const over = value > target
    return (
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ color: over ? 'var(--red)' : 'var(--text-secondary)' }}>
            {Math.round(value)}/{Math.round(target)}g
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : color, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>Nutrition</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Nutrition</h1>
          <p className="text-secondary text-sm">Track food & macros</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTargets(true)}>
          <Settings size={14} /> Targets
        </button>
      </div>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
        <button className="btn btn-icon" onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))}>
          <ChevronLeft size={18} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
          style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>
          {isToday ? 'Today' : format(new Date(date + 'T12:00:00'), 'EEE, d MMM')}
        </button>
        <button className="btn btn-icon" onClick={() => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calorie ring */}
      <div className="card-elevated" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 12px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={totals.calories > targets.calories ? 'var(--red)' : 'var(--accent)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${calPct * 3.267} 326.7`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {Math.round(totals.calories)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              / {Math.round(targets.calories)} kcal
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <MacroBar label="Protein" value={totals.protein} target={targets.protein_g} color="var(--accent)" />
          <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs_g} color="var(--amber)" />
          <MacroBar label="Fat" value={totals.fat} target={targets.fat_g} color="var(--green)" />
        </div>
      </div>

      {/* Meals */}
      {MEALS.map(meal => {
        const entries = log.filter(e => e.meal_type === meal.key)
        const mealCal = entries.reduce((s, e) => s + e.food_items.calories * e.servings, 0)
        return (
          <div key={meal.key} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{meal.label}</span>
                {mealCal > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{Math.round(mealCal)} kcal</span>}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => openPicker(meal.key)}>
                <Plus size={14} /> Add
              </button>
            </div>
            {entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {entries.map(e => (
                  <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {e.food_items.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {e.servings > 1 ? `${e.servings} × ` : ''}{e.food_items.serving_size}{e.food_items.serving_unit}
                        {e.food_items.brand && ` · ${e.food_items.brand}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{Math.round(e.food_items.calories * e.servings)}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>kcal</div>
                    </div>
                    <button onClick={() => handleDelete(e.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px'
                    }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: '12px',
                textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => openPicker(meal.key)}>
                Tap to add food
              </div>
            )}
          </div>
        )
      })}

      {/* Food Picker Modal */}
      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-handle" />

            {selectedFood ? (
              /* Confirm & set servings */
              <div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFood(null)} style={{ marginBottom: '12px' }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h3 style={{ marginBottom: '4px' }}>{selectedFood.name}</h3>
                {selectedFood.brand && <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>{selectedFood.brand}</p>}
                <div className="stat-grid" style={{ marginBottom: '16px' }}>
                  <div className="stat-tile"><div className="stat-label">Calories</div><div className="stat-value">{Math.round(selectedFood.calories * (parseFloat(servings) || 1))}</div></div>
                  <div className="stat-tile"><div className="stat-label">Protein</div><div className="stat-value">{Math.round(selectedFood.protein_g * (parseFloat(servings) || 1))}g</div></div>
                  <div className="stat-tile"><div className="stat-label">Carbs</div><div className="stat-value">{Math.round(selectedFood.carbs_g * (parseFloat(servings) || 1))}g</div></div>
                  <div className="stat-tile"><div className="stat-label">Fat</div><div className="stat-value">{Math.round(selectedFood.fat_g * (parseFloat(servings) || 1))}g</div></div>
                </div>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Servings ({selectedFood.serving_size}{selectedFood.serving_unit} each)</label>
                  <input type="number" className="input" value={servings} onChange={e => setServings(e.target.value)} min="0.25" step="0.25" inputMode="decimal" />
                </div>
                <button className="btn btn-primary btn-full btn-lg" onClick={handleLog} disabled={saving}>
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Logging…</> : <>Log Food</>}
                </button>
              </div>
            ) : (
              /* Search / My Foods / Custom */
              <div>
                <h3 style={{ marginBottom: '12px' }}>Add to {MEALS.find(m => m.key === pickerMeal)?.label}</h3>
                {/* Tabs */}
                <div className="tab-bar" style={{ marginBottom: '12px' }}>
                  <button className={`tab-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>🔍 Search</button>
                  <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => { setTab('my'); loadMyFoods() }}>📋 My Foods</button>
                  <button className={`tab-btn ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>✏️ Custom</button>
                </div>

                {tab === 'search' && (
                  <>
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input ref={searchRef} className="input" placeholder="Search foods…" value={searchQuery}
                        onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
                    </div>
                    <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                      {searching && <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={18} className="animate-spin" color="var(--text-muted)" /></div>}
                      {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.8rem' }}>No results — try a different search or create a custom food</p>
                      )}
                      {searchResults.map((r, i) => (
                        <FoodRow key={i} food={r} onSelect={() => { setSelectedFood(r); setServings('1') }} />
                      ))}
                    </div>
                  </>
                )}

                {tab === 'my' && (
                  <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                    {myFoods.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.8rem' }}>No saved foods yet. Search or create a custom food first.</p>
                    ) : myFoods.map(f => (
                      <FoodRow key={f.id} food={f} onSelect={() => { setSelectedFood(f); setServings('1') }} />
                    ))}
                  </div>
                )}

                {tab === 'custom' && (
                  <div>
                    <div className="input-group"><label className="input-label">Name</label>
                      <input className="input" placeholder="e.g., Homemade pasta" value={cfName} onChange={e => setCfName(e.target.value)} />
                    </div>
                    <div className="input-group"><label className="input-label">Brand (optional)</label>
                      <input className="input" placeholder="Brand" value={cfBrand} onChange={e => setCfBrand(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
                      <div className="input-group"><label className="input-label">Serving</label>
                        <input type="number" className="input" value={cfServing} onChange={e => setCfServing(e.target.value)} />
                      </div>
                      <div className="input-group"><label className="input-label">Unit</label>
                        <input className="input" value={cfUnit} onChange={e => setCfUnit(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="input-group"><label className="input-label">Calories</label>
                        <input type="number" className="input" placeholder="0" value={cfCal} onChange={e => setCfCal(e.target.value)} />
                      </div>
                      <div className="input-group"><label className="input-label">Protein (g)</label>
                        <input type="number" className="input" placeholder="0" value={cfP} onChange={e => setCfP(e.target.value)} />
                      </div>
                      <div className="input-group"><label className="input-label">Carbs (g)</label>
                        <input type="number" className="input" placeholder="0" value={cfC} onChange={e => setCfC(e.target.value)} />
                      </div>
                      <div className="input-group"><label className="input-label">Fat (g)</label>
                        <input type="number" className="input" placeholder="0" value={cfF} onChange={e => setCfF(e.target.value)} />
                      </div>
                    </div>
                    <button className="btn btn-primary btn-full btn-lg" onClick={handleCustomFood} disabled={saving || !cfName.trim()}>
                      {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Create & Log</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Targets Modal */}
      {showTargets && (
        <div className="modal-overlay" onClick={() => setShowTargets(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: '16px' }}>Daily Targets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="input-group"><label className="input-label">Calories</label>
                <input type="number" className="input" value={tCal} onChange={e => setTCal(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Protein (g)</label>
                <input type="number" className="input" value={tP} onChange={e => setTP(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Carbs (g)</label>
                <input type="number" className="input" value={tC} onChange={e => setTC(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Fat (g)</label>
                <input type="number" className="input" value={tF} onChange={e => setTF(e.target.value)} /></div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '8px' }} onClick={saveTargets}>Save Targets</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FoodRow({ food, onSelect }: { food: SearchResult; onSelect: () => void }) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
      background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', textAlign: 'left'
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {food.brand ? `${food.brand} · ` : ''}{food.serving_size}{food.serving_unit}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{Math.round(food.calories)}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>kcal</div>
      </div>
    </button>
  )
}

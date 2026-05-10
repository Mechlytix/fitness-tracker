'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewExercisePage() {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    name: '', category_id: '', equipment: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('exercise_categories').select('*').order('name')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()

    // Use the raw client to avoid TypeScript generic resolution issues
    // before the DB is connected and types are generated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any
    const { error: insertError } = await client.from('exercises').insert({
      name: form.name.trim(),
      category_id: form.category_id || null,
      equipment: form.equipment || null,
      notes: form.notes || null,
      is_custom: true,
      user_id: user?.id,
    })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    router.push('/exercises')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/exercises" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <h1 style={{ fontSize: '1.25rem' }}>New Exercise</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave} className="card-elevated">
        <div className="input-group">
          <label className="input-label" htmlFor="ex-name">Exercise Name *</label>
          <input id="ex-name" className="input" placeholder="e.g. Barbell Back Squat"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="ex-cat">Category</label>
          <select id="ex-cat" className="input" value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            style={{ appearance: 'none' }}>
            <option value="">— None —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="ex-eq">Equipment</label>
          <input id="ex-eq" className="input" placeholder="e.g. Barbell, Dumbbell, Cable…"
            value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="ex-notes">Notes</label>
          <textarea id="ex-notes" className="input" rows={3} placeholder="Cues, form notes…"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ resize: 'vertical' }} />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={saving || !form.name}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Exercise</>}
        </button>
      </form>
    </div>
  )
}

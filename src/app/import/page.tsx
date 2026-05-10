'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, ChevronRight, X
} from 'lucide-react'
import Link from 'next/link'

// ──────────────────────────────────────────────
// FitNotes CSV types
// ──────────────────────────────────────────────
type FitNotesRow = {
  Date: string
  Exercise: string
  Category: string
  'Weight (kg)': string
  'Weight (lbs)': string
  Reps: string
  Distance: string
  'Distance Unit': string
  Notes: string
  Kind: string
  [key: string]: string
}

type ParsedExercise = {
  name: string
  category: string
}

type ParsedWorkout = {
  date: string
  exercises: {
    exercise: string
    category: string
    sets: {
      weight_kg: number | null
      reps: number | null
      distance: number | null
      distance_unit: string | null
      time_seconds: number | null
      notes: string | null
    }[]
  }[]
}

type ImportStats = {
  workouts: number
  exercises: number
  sets: number
  categories: number
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function parseTimeToSeconds(t: string): number | null {
  if (!t) return null
  const parts = t.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

function parseFitNotesCSV(rows: FitNotesRow[]): ParsedWorkout[] {
  const workoutMap = new Map<string, ParsedWorkout>()

  for (const row of rows) {
    if (!row.Date || !row.Exercise) continue

    const date = row.Date.trim()
    if (!workoutMap.has(date)) {
      workoutMap.set(date, { date, exercises: [] })
    }
    const workout = workoutMap.get(date)!

    let ex = workout.exercises.find(e => e.exercise === row.Exercise)
    if (!ex) {
      ex = { exercise: row.Exercise, category: row.Category ?? 'Other', sets: [] }
      workout.exercises.push(ex)
    }

    // Parse weight with fallback for lbs
    let weightKg = parseFloat(row['Weight (kg)'])
    if (isNaN(weightKg) && row['Weight (lbs)']) {
      weightKg = parseFloat(row['Weight (lbs)']) * 0.453592
    } else if (isNaN(weightKg) && row['Weight (kgs)']) {
      // Just in case some versions use plural
      weightKg = parseFloat(row['Weight (kgs)'])
    } else if (isNaN(weightKg) && row['Weight']) {
      weightKg = parseFloat(row['Weight'])
    }
    
    // Round to 2 decimals if it's a valid number
    if (!isNaN(weightKg)) {
      weightKg = Math.round(weightKg * 100) / 100
    }

    const reps = parseInt(row.Reps)

    ex.sets.push({
      weight_kg: isNaN(weightKg) ? null : weightKg,
      reps: isNaN(reps) ? null : reps,
      distance: parseFloat(row.Distance) || null,
      distance_unit: row['Distance Unit'] || null,
      time_seconds: parseTimeToSeconds(row.Time),
      notes: row.Notes || null,
    })
  }

  return Array.from(workoutMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function ImportPage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any   // typed client causes never[] inference before real DB is connected
  const [step, setStep] = useState<ImportStep>('upload')
  const [workouts, setWorkouts] = useState<ParsedWorkout[]>([])
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    Papa.parse<FitNotesRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const parsed = parseFitNotesCSV(results.data)
        setWorkouts(parsed)

        const allExercises = new Set<string>()
        const allCategories = new Set<string>()
        let setCount = 0
        for (const w of parsed) {
          for (const ex of w.exercises) {
            allExercises.add(ex.exercise)
            allCategories.add(ex.category)
            setCount += ex.sets.length
          }
        }

        setStats({
          workouts: parsed.length,
          exercises: allExercises.size,
          sets: setCount,
          categories: allCategories.size,
        })
        setStep('preview')
      },
      error: (err) => {
        setErrors([`CSV parse error: ${err.message}`])
      }
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }, [handleFile])

  async function runImport() {
    setStep('importing')
    setErrors([])
    setProgress({ current: 0, total: workouts.length })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErrors(['Not authenticated']); setStep('preview'); return }

    const importErrors: string[] = []

    // ── 1. Upsert categories ──
    const allCategories = [...new Set(workouts.flatMap(w => w.exercises.map(e => e.category)))]
    const { data: existingCats } = await db.from('exercise_categories').select('id, name')
    const catMap = new Map<string, string>(((existingCats ?? []) as { id: string; name: string }[]).map((c: { id: string; name: string }) => [c.name, c.id]))

    for (const catName of allCategories) {
      if (!catMap.has(catName)) {
        const { data } = await db.from('exercise_categories')
          .insert({ name: catName }).select('id').single()
        if (data) catMap.set(catName, data.id)
      }
    }

    // ── 2. Upsert exercises ──
    const allExerciseNames = [...new Set(workouts.flatMap(w => w.exercises.map(e => e.exercise)))]
    const { data: existingEx } = await db.from('exercises').select('id, name')
    const exMap = new Map<string, string>(((existingEx ?? []) as { id: string; name: string }[]).map((e: { id: string; name: string }) => [e.name.toLowerCase(), e.id]))

    // Find category for each exercise (use first occurrence)
    const exToCat = new Map<string, string>()
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (!exToCat.has(ex.exercise)) exToCat.set(ex.exercise, ex.category)
      }
    }

    for (const exName of allExerciseNames) {
      const key = exName.toLowerCase()
      if (!exMap.has(key)) {
        const catName = exToCat.get(exName) ?? 'Other'
        const catId = catMap.get(catName) ?? null
        const { data } = await db.from('exercises')
          .insert({ name: exName, category_id: catId, is_custom: false }).select('id').single()
        if (data) exMap.set(key, data.id)
      }
    }

    // ── 3. Import workouts ──
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i]
      setProgress({ current: i + 1, total: workouts.length })

      try {
        // Check if workout on this date already exists
        const { data: existing } = await db
          .from('workouts')
          .select('id')
          .eq('user_id', user.id)
          .eq('workout_date', w.date)
          .single()

        let workoutId: string

        if (existing) {
          workoutId = existing.id
          // Prevent duplication: delete existing sets for this workout before re-inserting
          await db.from('workout_sets').delete().eq('workout_id', workoutId)
        } else {
          const { data: newWorkout, error: wErr } = await db
            .from('workouts')
            .insert({ user_id: user.id, workout_date: w.date })
            .select('id')
            .single()

          if (wErr || !newWorkout) {
            importErrors.push(`Failed to create workout for ${w.date}: ${wErr?.message}`)
            continue
          }
          workoutId = newWorkout.id
        }

        // Build all sets for this workout
        const sets = w.exercises.flatMap((ex: { exercise: string; sets: { weight_kg: number | null; reps: number | null; distance: number | null; distance_unit: string | null; time_seconds: number | null; notes: string | null }[] }, exIdx: number) => {
          const exerciseId = exMap.get(ex.exercise.toLowerCase())
          if (!exerciseId) {
            importErrors.push(`Exercise not found: ${ex.exercise}`)
            return []
          }
          return ex.sets.map((s: { weight_kg: number | null; reps: number | null; distance: number | null; distance_unit: string | null; time_seconds: number | null; notes: string | null }, sIdx: number) => ({
            workout_id: workoutId,
            exercise_id: exerciseId,
            set_order: exIdx * 100 + sIdx,
            weight_kg: s.weight_kg,
            reps: s.reps,
            distance: s.distance,
            distance_unit: s.distance_unit,
            time_seconds: s.time_seconds,
            notes: s.notes,
          }))
        })

        if (sets.length > 0) {
          const { error: sErr } = await db.from('workout_sets').insert(sets)
          if (sErr) importErrors.push(`Sets error for ${w.date}: ${sErr.message}`)
        }
      } catch (err) {
        importErrors.push(`Error importing ${w.date}: ${String(err)}`)
      }
    }

    setErrors(importErrors)
    setStep('done')
  }

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href="/" className="btn btn-icon"><ArrowLeft size={16} /></Link>
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>Import FitNotes</h1>
          <p className="text-secondary text-sm">Import your CSV export</p>
        </div>
      </div>

      {/* ── Upload step ── */}
      {step === 'upload' && (
        <>
          {/* How-to */}
          <div className="card-elevated" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>How to export from FitNotes</h3>
            {[
              'Open FitNotes on your Android phone',
              'Tap the menu (⋮) → Backup & Restore',
              'Select "Export to CSV"',
              'Share / copy the file to this device',
              'Upload it below',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, background: 'var(--accent-dim)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, marginTop: '1px'
                }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('csv-input')?.click()}
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color var(--transition), background var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-dim)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Upload size={36} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Drop your CSV here
            </p>
            <p className="text-secondary text-sm">or click to browse</p>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        </>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && stats && (
        <>
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <FileText size={16} />
            <span>Parsed <strong>{fileName}</strong> — ready to import.</span>
          </div>

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-tile">
              <div className="stat-label">Workouts</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{stats.workouts}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Exercises</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{stats.exercises}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Sets</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{stats.sets.toLocaleString()}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Categories</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{stats.categories}</div>
            </div>
          </div>

          {/* Date range */}
          {workouts.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <div>
                  <div className="stat-label">From</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {workouts[0].date}
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-label">To</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {workouts[workouts.length - 1].date}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>Existing workouts on the same dates will be skipped (not overwritten).</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setStep('upload'); setWorkouts([]); setStats(null) }}
            >
              <X size={14} /> Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={runImport}>
              Import {stats.workouts} workouts <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}

      {/* ── Importing step ── */}
      {step === 'importing' && (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Loader2 size={40} className="animate-spin" color="var(--accent)"
            style={{ margin: '0 auto 20px' }} />
          <h2 style={{ marginBottom: '8px' }}>Importing…</h2>
          <p className="text-secondary" style={{ marginBottom: '20px' }}>
            Workout {progress.current} of {progress.total}
          </p>
          <div className="progress-bar" style={{ maxWidth: '280px', margin: '0 auto' }}>
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Done step ── */}
      {step === 'done' && (
        <div>
          <div className="card-elevated" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: '20px' }}>
            <CheckCircle2
              size={52} color="var(--green)"
              style={{ margin: '0 auto 16px', display: 'block' }}
            />
            <h2 style={{ marginBottom: '8px' }}>Import complete!</h2>
            <p className="text-secondary" style={{ marginBottom: '20px', lineHeight: 1.6 }}>
              Successfully imported {stats?.workouts} workouts with {stats?.sets.toLocaleString()} sets.
              Your full FitNotes history is now in FitTrack.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/workouts" className="btn btn-primary">View Workouts</Link>
              <Link href="/exercises" className="btn btn-secondary">Exercise Library</Link>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="card-elevated" style={{ borderColor: 'var(--amber)' }}>
              <h4 style={{ color: 'var(--amber)', marginBottom: '12px' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                {errors.length} warning{errors.length !== 1 ? 's' : ''}
              </h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {errors.map((err, i) => (
                  <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

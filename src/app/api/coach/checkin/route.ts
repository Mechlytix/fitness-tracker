import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  // Gather last 7 days of data
  const [profileRes, workoutsRes, foodRes, weightRes, targetsRes, goalsRes, planRes] = await Promise.all([
    supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('workouts').select('workout_date, notes, workout_sets(set_order, weight_kg, reps, exercises(name))').eq('user_id', user.id).gte('workout_date', weekAgo).order('workout_date'),
    supabase.from('food_log').select('log_date, meal_type, servings, food_items(name, calories, protein_g, carbs_g, fat_g)').eq('user_id', user.id).gte('log_date', weekAgo).order('log_date'),
    supabase.from('weight_log').select('log_date, weight_kg').eq('user_id', user.id).order('log_date', { ascending: false }).limit(14),
    supabase.from('nutrition_targets').select('*').eq('user_id', user.id).single(),
    supabase.from('user_goals').select('*').eq('user_id', user.id).eq('is_achieved', false),
    supabase.from('workout_plans').select('name, plan_days(day_name, plan_exercises(exercises(name), plan_sets(target_weight_kg, target_reps)))').eq('user_id', user.id).eq('is_active', true).single(),
  ])

  const profile = profileRes.data
  const workouts = workoutsRes.data ?? []
  const foodLogs = foodRes.data ?? []
  const weights = weightRes.data ?? []
  const targets = targetsRes.data ?? { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 }
  const goals = goalsRes.data ?? []

  // Format workouts
  let workoutSummary = 'No workouts this week.'
  if (workouts.length > 0) {
    workoutSummary = workouts.map((w: any) => {
      const sets = (w.workout_sets as any[]) ?? []
      const groups = new Map<string, string[]>()
      sets.sort((a: any, b: any) => (a.set_order ?? 0) - (b.set_order ?? 0))
        .forEach((s: any) => {
          const name = s.exercises?.name || 'Unknown'
          if (!groups.has(name)) groups.set(name, [])
          groups.get(name)!.push(`${s.weight_kg ?? 'BW'}kg × ${s.reps ?? 0}`)
        })
      let text = `### ${w.workout_date}\n`
      groups.forEach((ss, name) => { text += `- ${name}: ${ss.join(' | ')}\n` })
      return text
    }).join('\n')
  }

  // Format nutrition by day
  let nutritionSummary = 'No food logged this week.'
  if (foodLogs.length > 0) {
    const byDay = new Map<string, { cal: number; p: number; c: number; f: number }>()
    foodLogs.forEach((e: any) => {
      const d = e.log_date
      if (!byDay.has(d)) byDay.set(d, { cal: 0, p: 0, c: 0, f: 0 })
      const day = byDay.get(d)!
      const fi = e.food_items as any
      const s = e.servings
      day.cal += (fi?.calories ?? 0) * s
      day.p += (fi?.protein_g ?? 0) * s
      day.c += (fi?.carbs_g ?? 0) * s
      day.f += (fi?.fat_g ?? 0) * s
    })
    const lines: string[] = []
    byDay.forEach((v, d) => {
      lines.push(`- ${d}: ${Math.round(v.cal)} kcal | P:${Math.round(v.p)}g C:${Math.round(v.c)}g F:${Math.round(v.f)}g`)
    })
    nutritionSummary = lines.join('\n')
  }

  // Weight trend
  let weightTrend = 'No weight data.'
  if (weights.length > 0) {
    weightTrend = weights.map((w: any) => `- ${w.log_date}: ${w.weight_kg}kg`).join('\n')
  }

  const prompt = `You are an expert fitness and nutrition coach doing a weekly check-in review.

CLIENT PROFILE: ${profile ? `${profile.weight_kg}kg, ${profile.height_cm}cm, Age ${profile.age}, ${profile.sex}, Goal: ${profile.goal}` : 'Unknown'}

CURRENT NUTRITION TARGETS: ${targets.calories} kcal | P:${targets.protein_g}g C:${targets.carbs_g}g F:${targets.fat_g}g

ACTIVE GOALS:
${goals.length > 0 ? goals.map((g: any) => `- ${g.title}${g.target_value ? ` (Target: ${g.target_value}${g.target_unit ?? ''})` : ''}`).join('\n') : 'None set'}

WEIGHT TREND (most recent first):
${weightTrend}

THIS WEEK'S WORKOUTS (${workouts.length} sessions):
${workoutSummary}

THIS WEEK'S NUTRITION (daily totals vs target of ${targets.calories} kcal):
${nutritionSummary}

Review the past week holistically and return ONLY valid JSON:
{
  "insights": "markdown string — 3-5 key observations about the week covering BOTH training and nutrition",
  "workout_adjustments": "markdown string — specific exercise/weight/rep changes to make to the plan and why",
  "nutrition_adjustments": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "reasoning": "string explaining why targets changed or stayed the same"
  },
  "goal_progress": [
    { "title": "string", "status": "on_track|behind|ahead", "note": "string" }
  ],
  "motivation": "string — one encouraging sentence"
}`

  try {
    const result = await generateText({ model: google('gemini-2.5-flash'), prompt })
    let text = result.text.trim()
    if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const review = JSON.parse(text)
    return Response.json(review)
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

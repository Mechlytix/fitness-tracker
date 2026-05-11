import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { weight_kg, height_cm, age, sex, activity_level, goal, days_per_week, equipment, focus_areas, dietary_notes } = body

  // Save profile
  await supabase.from('user_profile').upsert({
    user_id: user.id, weight_kg, height_cm, age, sex,
    activity_level, goal, onboarded: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Log initial weight
  await supabase.from('weight_log').upsert({
    user_id: user.id,
    log_date: new Date().toISOString().slice(0, 10),
    weight_kg,
  }, { onConflict: 'user_id,log_date' })

  // Get existing exercises
  const { data: exercises } = await supabase
    .from('exercises')
    .select('name, exercise_categories(name)')
    .eq('user_id', user.id)

  const exerciseList = exercises?.map((e: any) =>
    `${e.name} (${e.exercise_categories?.name ?? 'Other'})`
  ).join(', ') || 'No exercises yet — create standard gym exercises.'

  // Get existing PRs
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select('workout_sets(weight_kg, reps, exercises(name))')
    .eq('user_id', user.id)

  const prMap = new Map<string, { weight: number; reps: number }>()
  allWorkouts?.forEach((w: any) => {
    (w.workout_sets as any[])?.forEach((s: any) => {
      const name = s.exercises?.name || 'Unknown'
      const weight = s.weight_kg ?? 0
      const existing = prMap.get(name)
      if (!existing || weight > existing.weight) prMap.set(name, { weight, reps: s.reps ?? 0 })
    })
  })

  let prSummary = 'No workout history yet.'
  if (prMap.size > 0) {
    const lines: string[] = []
    prMap.forEach((pr, name) => lines.push(`- ${name}: ${pr.weight}kg × ${pr.reps}`))
    prSummary = lines.join('\n')
  }

  const prompt = `You are an expert personal trainer and sports nutritionist creating a unified training and nutrition program.

CLIENT PROFILE:
- Weight: ${weight_kg}kg, Height: ${height_cm}cm, Age: ${age}, Sex: ${sex}
- Activity level multiplier: ${activity_level}
- Goal: ${goal === 'lose' ? 'Fat loss (caloric deficit)' : goal === 'gain' ? 'Muscle gain (caloric surplus)' : 'Body recomposition (maintenance)'}
- Training days per week: ${days_per_week}
- Equipment: ${equipment}
${focus_areas ? `- Focus areas: ${focus_areas}` : ''}
${dietary_notes ? `- Dietary notes: ${dietary_notes}` : ''}

AVAILABLE EXERCISES: ${exerciseList}
CURRENT PRs: ${prSummary}

Generate a COMPLETE program. Return ONLY valid JSON matching this schema:
{
  "plan": {
    "name": "string",
    "description": "string explaining the programming rationale",
    "days": [
      {
        "day_name": "string",
        "weekday": number_or_null,
        "exercises": [
          {
            "exercise_name": "string (must match an available exercise or be a standard gym exercise)",
            "sets": [{ "target_weight_kg": number_or_null, "target_reps": number }]
          }
        ]
      }
    ]
  },
  "nutrition": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "reasoning": "string explaining calorie/macro choices"
  },
  "goals": [
    { "title": "string", "goal_type": "strength|hypertrophy|endurance|weight_loss|general", "target_value": number_or_null, "target_unit": "string_or_null" }
  ],
  "summary": "string — 2-3 sentence overview of the complete program"
}`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
    })

    let text = result.text.trim()
    if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const program = JSON.parse(text)

    // === Apply the program ===

    // 1. Deactivate old plans, create new one
    await supabase.from('workout_plans').update({ is_active: false }).eq('user_id', user.id)

    const { data: plan } = await supabase
      .from('workout_plans')
      .insert({ user_id: user.id, name: program.plan.name, description: program.plan.description, is_active: true })
      .select('id').single()

    if (plan) {
      for (let di = 0; di < program.plan.days.length; di++) {
        const d = program.plan.days[di]
        const { data: dayRow } = await supabase
          .from('plan_days')
          .insert({ plan_id: plan.id, day_name: d.day_name, day_order: di, weekday: d.weekday ?? null })
          .select('id').single()

        if (!dayRow) continue

        for (let ei = 0; ei < d.exercises.length; ei++) {
          const ex = d.exercises[ei]
          // Find or create exercise
          let { data: exRow } = await supabase
            .from('exercises')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', ex.exercise_name)
            .single()

          if (!exRow) {
            const { data: created } = await supabase
              .from('exercises')
              .insert({ user_id: user.id, name: ex.exercise_name })
              .select('id').single()
            exRow = created
          }
          if (!exRow) continue

          const { data: peRow } = await supabase
            .from('plan_exercises')
            .insert({ plan_day_id: dayRow.id, exercise_id: exRow.id, exercise_order: ei })
            .select('id').single()

          if (!peRow) continue

          const sets = (ex.sets ?? []).map((s: any, si: number) => ({
            plan_exercise_id: peRow.id,
            set_order: si,
            target_weight_kg: s.target_weight_kg ?? null,
            target_reps: s.target_reps ?? null,
          }))
          if (sets.length > 0) await supabase.from('plan_sets').insert(sets)
        }
      }
    }

    // 2. Set nutrition targets
    if (program.nutrition) {
      await supabase.from('nutrition_targets').upsert({
        user_id: user.id,
        calories: program.nutrition.calories,
        protein_g: program.nutrition.protein_g,
        carbs_g: program.nutrition.carbs_g,
        fat_g: program.nutrition.fat_g,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    // 3. Set goals
    if (program.goals?.length > 0) {
      const goals = program.goals.map((g: any) => ({
        user_id: user.id,
        goal_type: g.goal_type ?? 'general',
        title: g.title,
        target_value: g.target_value ?? null,
        target_unit: g.target_unit ?? null,
      }))
      await supabase.from('user_goals').insert(goals)
    }

    return Response.json({ program })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

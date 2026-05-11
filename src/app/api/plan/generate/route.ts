import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const { goal, daysPerWeek, focusAreas, equipment } = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  // Load user's exercise library
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, exercise_categories(name)')
    .order('name')

  const exerciseList = (exercises ?? []).map((e: any) =>
    `- ${e.name} (${e.exercise_categories?.name ?? 'Other'}) [id: ${e.id}]`
  ).join('\n')

  // Load user's workout history + PRs
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select(`workout_date, workout_sets(weight_kg, reps, exercises(name))`)
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .limit(100)

  let prSummary = 'No workout history yet.'
  if (allWorkouts && allWorkouts.length > 0) {
    const prMap = new Map<string, { weight: number; reps: number }>()
    allWorkouts.forEach((w: any) => {
      (w.workout_sets as any[])?.forEach((s: any) => {
        const name = s.exercises?.name || 'Unknown'
        const weight = s.weight_kg ?? 0
        const existing = prMap.get(name)
        if (!existing || weight > existing.weight) {
          prMap.set(name, { weight, reps: s.reps ?? 0 })
        }
      })
    })
    const lines: string[] = []
    prMap.forEach((pr, name) => lines.push(`- ${name}: ${pr.weight}kg × ${pr.reps}`))
    prSummary = `Personal Records:\n${lines.join('\n')}\n\nTotal sessions logged: ${allWorkouts.length}`
  }

  // Load user goals
  const { data: goals } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_achieved', false)

  let goalsContext = 'No goals set.'
  if (goals && goals.length > 0) {
    goalsContext = goals.map((g: any) =>
      `- ${g.title}${g.target_value ? ` (Target: ${g.target_value} ${g.target_unit ?? ''})` : ''}${g.deadline ? ` by ${g.deadline}` : ''}: ${g.description ?? ''}`
    ).join('\n')
  }

  const systemPrompt = `You are an expert strength & conditioning coach creating a workout plan.

USER'S GOALS:
${goalsContext}

USER'S CURRENT PRs & HISTORY:
${prSummary}

USER'S EXERCISE LIBRARY (you MUST only use exercise names from this list):
${exerciseList}

PLAN REQUEST:
- Goal: ${goal || 'General fitness'}
- Days per week: ${daysPerWeek || 4}
- Focus areas: ${focusAreas || 'Balanced'}
- Equipment available: ${equipment || 'Full gym'}

CRITICAL RULES:
1. ONLY use exercises from the user's exercise library listed above. Use EXACT names.
2. Prescribe weights based on the user's actual PRs — typically 70-85% of PR for working sets.
3. If the user has no history for an exercise, prescribe conservative starting weights.
4. Each day should have 4-6 exercises, 3-4 working sets each.
5. Include the exercise_id from the library in your response.
6. Structure the plan as a progressive program aligned with the user's goals.

Return ONLY a valid JSON object with NO markdown formatting, NO code fences, NO explanation. Just the raw JSON:
{
  "name": "Plan Name",
  "description": "Brief description mentioning goals",
  "days": [
    {
      "day_name": "Day Name",
      "day_order": 0,
      "weekday": null,
      "notes": "Session focus and coaching cues",
      "exercises": [
        {
          "exercise_id": "uuid-from-library",
          "exercise_name": "Exact Name",
          "exercise_order": 0,
          "notes": "Optional coaching notes",
          "sets": [
            { "set_order": 0, "target_weight_kg": 60, "target_reps": 8, "notes": null }
          ]
        }
      ]
    }
  ]
}`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: systemPrompt,
    })

    // Parse the JSON response
    let planData: any
    try {
      // Strip any markdown code fences if present
      let text = result.text.trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      planData = JSON.parse(text)
    } catch {
      return Response.json(
        { error: 'AI returned invalid JSON. Please try again.', raw: result.text },
        { status: 422 }
      )
    }

    // Validate structure
    if (!planData.days || !Array.isArray(planData.days) || planData.days.length === 0) {
      return Response.json({ error: 'AI returned a plan with no days.' }, { status: 422 })
    }

    // Deactivate existing plans
    await supabase
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Insert plan
    const { data: plan, error: planErr } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: planData.name || 'AI Generated Plan',
        description: planData.description || '',
        is_active: true,
      })
      .select('id')
      .single()

    if (planErr || !plan) {
      return Response.json({ error: planErr?.message ?? 'Failed to create plan' }, { status: 500 })
    }

    // Insert days, exercises, sets
    for (const day of planData.days) {
      const { data: planDay, error: dayErr } = await supabase
        .from('plan_days')
        .insert({
          plan_id: plan.id,
          day_name: day.day_name,
          day_order: day.day_order ?? 0,
          weekday: day.weekday,
          notes: day.notes,
        })
        .select('id')
        .single()

      if (dayErr || !planDay) continue

      for (const ex of day.exercises ?? []) {
        // Validate exercise_id exists
        const validExercise = (exercises ?? []).find((e: any) => e.id === ex.exercise_id)
        if (!validExercise) continue

        const { data: planEx, error: exErr } = await supabase
          .from('plan_exercises')
          .insert({
            plan_day_id: planDay.id,
            exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order ?? 0,
            notes: ex.notes,
          })
          .select('id')
          .single()

        if (exErr || !planEx) continue

        const sets = (ex.sets ?? []).map((s: any, i: number) => ({
          plan_exercise_id: planEx.id,
          set_order: s.set_order ?? i,
          target_weight_kg: s.target_weight_kg,
          target_reps: s.target_reps,
          notes: s.notes,
        }))

        if (sets.length > 0) {
          await supabase.from('plan_sets').insert(sets)
        }
      }
    }

    return Response.json({ planId: plan.id, name: planData.name })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Failed to generate plan' }, { status: 500 })
  }
}

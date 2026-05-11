import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const { planDayId, workoutId } = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  // Load the plan day with its targets
  const { data: planDay } = await supabase
    .from('plan_days')
    .select(`
      id, day_name, notes,
      plan_exercises (
        id, exercise_order, notes,
        exercises ( id, name ),
        plan_sets ( id, set_order, target_weight_kg, target_reps, notes )
      )
    `)
    .eq('id', planDayId)
    .single()

  if (!planDay) return Response.json({ error: 'Plan day not found' }, { status: 404 })

  // Load the completed workout (actuals)
  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      workout_date, notes,
      workout_sets ( set_order, weight_kg, reps, exercises ( name ) )
    `)
    .eq('id', workoutId)
    .single()

  if (!workout) return Response.json({ error: 'Workout not found' }, { status: 404 })

  // Load user goals for context
  const { data: goals } = await supabase
    .from('user_goals')
    .select('title, description, target_value, target_unit, deadline')
    .eq('user_id', user.id)
    .eq('is_achieved', false)

  let goalsContext = 'No goals set.'
  if (goals && goals.length > 0) {
    goalsContext = goals.map((g: any) =>
      `- ${g.title}${g.target_value ? ` (Target: ${g.target_value} ${g.target_unit ?? ''})` : ''}${g.deadline ? ` by ${g.deadline}` : ''}`
    ).join('\n')
  }

  // Format the planned vs actual comparison
  const planExercises = (planDay.plan_exercises as any[])
    ?.sort((a: any, b: any) => a.exercise_order - b.exercise_order) ?? []

  const workoutSets = (workout.workout_sets as any[])
    ?.sort((a: any, b: any) => (a.set_order ?? 0) - (b.set_order ?? 0)) ?? []

  let comparison = ''
  for (const pe of planExercises) {
    const exName = pe.exercises?.name ?? 'Unknown'
    const targets = (pe.plan_sets as any[])?.sort((a: any, b: any) => a.set_order - b.set_order) ?? []
    const actuals = workoutSets.filter((s: any) => s.exercises?.name === exName)

    comparison += `\n### ${exName}\n`
    comparison += `| Set | Target | Actual |\n|-----|--------|--------|\n`
    const maxSets = Math.max(targets.length, actuals.length)
    for (let i = 0; i < maxSets; i++) {
      const t = targets[i]
      const a = actuals[i]
      const targetStr = t ? `${t.target_weight_kg}kg × ${t.target_reps}` : '—'
      const actualStr = a ? `${a.weight_kg ?? 0}kg × ${a.reps ?? 0}` : '—'
      comparison += `| ${i + 1} | ${targetStr} | ${actualStr} |\n`
    }
    if (pe.notes) comparison += `Coach notes: ${pe.notes}\n`
  }

  const systemPrompt = `You are an expert strength coach reviewing a completed workout and adjusting the next session.

USER'S ACTIVE GOALS:
${goalsContext}

SESSION: "${planDay.day_name}"
DATE: ${workout.workout_date}

PLANNED vs ACTUAL PERFORMANCE:
${comparison}

ADJUSTMENT RULES:
1. If the user MET or EXCEEDED rep targets at prescribed weight → increase weight by 2.5kg for that exercise next time.
2. If the user MISSED targets by 1-2 reps → keep the same weight, adjust reps to match what they achieved + 1.
3. If the user MISSED targets by 3+ reps → reduce weight by 2.5kg.
4. Consider the user's goals when making adjustments (e.g., strength goals = lower reps heavier weight; hypertrophy = moderate weight more reps).
5. Provide brief coaching feedback for each exercise.

Return ONLY valid JSON with NO markdown, NO code fences:
{
  "summary": "Brief overall review (2-3 sentences)",
  "exercise_adjustments": [
    {
      "plan_exercise_id": "uuid",
      "exercise_name": "Name",
      "feedback": "What happened and why the adjustment",
      "new_sets": [
        { "set_order": 0, "target_weight_kg": 62.5, "target_reps": 8 }
      ]
    }
  ]
}`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: systemPrompt,
    })

    let reviewData: any
    try {
      let text = result.text.trim()
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      reviewData = JSON.parse(text)
    } catch {
      return Response.json(
        { error: 'AI returned invalid response. Please try again.', raw: result.text },
        { status: 422 }
      )
    }

    // Apply adjustments to plan sets
    for (const adj of reviewData.exercise_adjustments ?? []) {
      const peId = adj.plan_exercise_id
      if (!peId) continue

      // Delete old sets
      await supabase.from('plan_sets').delete().eq('plan_exercise_id', peId)

      // Insert new sets
      const newSets = (adj.new_sets ?? []).map((s: any, i: number) => ({
        plan_exercise_id: peId,
        set_order: s.set_order ?? i,
        target_weight_kg: s.target_weight_kg,
        target_reps: s.target_reps,
        notes: s.notes ?? null,
      }))

      if (newSets.length > 0) {
        await supabase.from('plan_sets').insert(newSets)
      }
    }

    return Response.json({
      summary: reviewData.summary,
      adjustments: reviewData.exercise_adjustments,
    })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Review failed' }, { status: 500 })
  }
}

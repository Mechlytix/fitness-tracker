import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const { planId } = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  // Load the full plan
  const { data: plan } = await supabase
    .from('workout_plans')
    .select(`
      name, description,
      plan_days (
        id, day_name, day_order, weekday, notes,
        plan_exercises (
          id, exercise_order, notes,
          exercises ( name ),
          plan_sets ( set_order, target_weight_kg, target_reps )
        )
      )
    `)
    .eq('id', planId)
    .single()

  if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 })

  // Load user's PRs
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select(`workout_sets(weight_kg, reps, exercises(name))`)
    .eq('user_id', user.id)

  const prMap = new Map<string, { weight: number; reps: number }>()
  allWorkouts?.forEach((w: any) => {
    (w.workout_sets as any[])?.forEach((s: any) => {
      const name = s.exercises?.name || 'Unknown'
      const weight = s.weight_kg ?? 0
      const existing = prMap.get(name)
      if (!existing || weight > existing.weight) {
        prMap.set(name, { weight, reps: s.reps ?? 0 })
      }
    })
  })

  let prSummary = 'No workout history.'
  if (prMap.size > 0) {
    const lines: string[] = []
    prMap.forEach((pr, name) => lines.push(`- ${name}: ${pr.weight}kg × ${pr.reps}`))
    prSummary = lines.join('\n')
  }

  // Load user goals
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

  // Format the plan
  const planDays = ((plan.plan_days as any[]) ?? []).sort((a: any, b: any) => a.day_order - b.day_order)
  let planText = ''
  for (const day of planDays) {
    planText += `\n### ${day.day_name}\n`
    const exercises = ((day.plan_exercises as any[]) ?? []).sort((a: any, b: any) => a.exercise_order - b.exercise_order)
    for (const ex of exercises) {
      const sets = ((ex.plan_sets as any[]) ?? []).sort((a: any, b: any) => a.set_order - b.set_order)
      const setStr = sets.map((s: any) => `${s.target_weight_kg ?? '?'}kg × ${s.target_reps ?? '?'}`).join(' | ')
      planText += `- **${ex.exercises?.name ?? 'Unknown'}**: ${setStr}\n`
      if (ex.notes) planText += `  _${ex.notes}_\n`
    }
  }

  const prompt = `You are an expert strength & conditioning coach reviewing a workout plan.

USER'S GOALS:
${goalsContext}

USER'S CURRENT PRs:
${prSummary}

PLAN: "${plan.name}"
${plan.description ? `Description: ${plan.description}` : ''}
${planText}

Review this plan and provide:
1. An overall rating (1-10) and summary
2. Strengths of the plan
3. Areas for improvement
4. Specific suggestions (e.g., exercise swaps, volume adjustments, weight adjustments based on PRs)
5. Whether the plan aligns with the user's goals

Format your response in clear Markdown with headers and bullet points. Be specific and actionable.`

  try {
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt,
    })

    return Response.json({ review: result.text })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Review failed' }, { status: 500 })
  }
}

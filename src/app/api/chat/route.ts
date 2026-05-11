import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'

// Allow streaming responses up to 60 seconds for deep analysis
export const maxDuration = 60

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fetch ALL workout data for this user — gives the AI complete context
  const { data: allWorkouts } = await supabase
    .from('workouts')
    .select(`
      workout_date,
      notes,
      workout_sets (
        set_order,
        weight_kg,
        reps,
        exercises ( name )
      )
    `)
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })

  // Format all workouts into a structured string for the system prompt
  let workoutData = 'No workouts logged yet.'
  if (allWorkouts && allWorkouts.length > 0) {
    workoutData = allWorkouts.map((w: any) => {
      let wStr = `## ${w.workout_date}`
      if (w.notes) wStr += ` — ${w.notes}`
      wStr += '\n'

      const sets = w.workout_sets as any[]
      if (sets && sets.length > 0) {
        // Group sets by exercise for readability
        const groups = new Map<string, string[]>()
        sets
          .sort((a: any, b: any) => (a.set_order ?? 0) - (b.set_order ?? 0))
          .forEach((s: any) => {
            const exName = s.exercises?.name || 'Unknown'
            if (!groups.has(exName)) groups.set(exName, [])
            groups.get(exName)!.push(
              `${s.weight_kg ? s.weight_kg + 'kg' : 'BW'} × ${s.reps ?? 0}`
            )
          })

        groups.forEach((setStrs, exName) => {
          wStr += `- **${exName}**: ${setStrs.join(' | ')}\n`
        })
      }
      return wStr
    }).join('\n')
  }

  // Build per-exercise PR summary for quick reference
  let prSummary = ''
  if (allWorkouts && allWorkouts.length > 0) {
    const prMap = new Map<string, { weight: number; reps: number; date: string }>()
    allWorkouts.forEach((w: any) => {
      const sets = w.workout_sets as any[]
      if (!sets) return
      sets.forEach((s: any) => {
        const name = s.exercises?.name || 'Unknown'
        const weight = s.weight_kg ?? 0
        const existing = prMap.get(name)
        if (!existing || weight > existing.weight) {
          prMap.set(name, { weight, reps: s.reps ?? 0, date: w.workout_date })
        }
      })
    })

    const prLines: string[] = []
    prMap.forEach((pr, name) => {
      prLines.push(`- **${name}**: ${pr.weight}kg × ${pr.reps} (${pr.date})`)
    })
    prSummary = `\n## Personal Records (Heaviest Weight)\n${prLines.join('\n')}\n`
  }

  // Fetch user goals
  const { data: userGoals } = await supabase
    .from('user_goals')
    .select('title, description, target_value, target_unit, deadline, is_achieved')
    .eq('user_id', user.id)

  let goalsSection = ''
  if (userGoals && userGoals.length > 0) {
    const activeGoals = userGoals.filter((g: any) => !g.is_achieved)
    const achievedGoals = userGoals.filter((g: any) => g.is_achieved)
    if (activeGoals.length > 0) {
      goalsSection += `\n## Active Goals\n`
      activeGoals.forEach((g: any) => {
        goalsSection += `- **${g.title}**${g.target_value ? ` (Target: ${g.target_value} ${g.target_unit ?? ''})` : ''}${g.deadline ? ` by ${g.deadline}` : ''}${g.description ? `: ${g.description}` : ''}\n`
      })
    }
    if (achievedGoals.length > 0) {
      goalsSection += `\n## Achieved Goals\n`
      achievedGoals.forEach((g: any) => {
        goalsSection += `- ✅ ${g.title}\n`
      })
    }
  }

  // Fetch profile, nutrition targets, today's food, weight trend
  const today = new Date().toISOString().slice(0, 10)

  const [profileRes, targetsRes, todayFoodRes, weightRes] = await Promise.all([
    supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('nutrition_targets').select('*').eq('user_id', user.id).single(),
    supabase.from('food_log').select('servings, food_items(name, calories, protein_g, carbs_g, fat_g)').eq('user_id', user.id).eq('log_date', today),
    supabase.from('weight_log').select('log_date, weight_kg').eq('user_id', user.id).order('log_date', { ascending: false }).limit(10),
  ])

  const profile = profileRes.data
  const targets = targetsRes.data
  const todayFood = todayFoodRes.data ?? []
  const weights = weightRes.data ?? []

  let profileSection = ''
  if (profile) {
    profileSection = `\n## Client Profile\n- Weight: ${profile.weight_kg ?? '?'}kg, Height: ${profile.height_cm ?? '?'}cm, Age: ${profile.age ?? '?'}, Sex: ${profile.sex ?? '?'}\n- Goal: ${profile.goal ?? 'maintain'}\n- Activity level: ${profile.activity_level ?? '1.55'}\n`
  }

  let nutritionSection = ''
  if (targets) {
    nutritionSection += `\n## Nutrition Targets\n- ${targets.calories} kcal | Protein: ${targets.protein_g}g | Carbs: ${targets.carbs_g}g | Fat: ${targets.fat_g}g\n`
  }
  if (todayFood.length > 0) {
    const totals = todayFood.reduce((acc: any, e: any) => {
      const fi = e.food_items as any
      const s = e.servings
      return { cal: acc.cal + (fi?.calories ?? 0) * s, p: acc.p + (fi?.protein_g ?? 0) * s, c: acc.c + (fi?.carbs_g ?? 0) * s, f: acc.f + (fi?.fat_g ?? 0) * s }
    }, { cal: 0, p: 0, c: 0, f: 0 })
    nutritionSection += `\n## Today's Food (${today})\n- Consumed: ${Math.round(totals.cal)} kcal | P: ${Math.round(totals.p)}g | C: ${Math.round(totals.c)}g | F: ${Math.round(totals.f)}g\n`
    if (targets) {
      nutritionSection += `- Remaining: ${Math.round(targets.calories - totals.cal)} kcal | P: ${Math.round(targets.protein_g - totals.p)}g\n`
    }
  }

  let weightSection = ''
  if (weights.length > 0) {
    weightSection = `\n## Weight Trend (recent)\n` + weights.map((w: any) => `- ${w.log_date}: ${w.weight_kg}kg`).join('\n') + '\n'
  }

  const systemPrompt = `You are a world-class, data-driven personal fitness AND nutrition coach.
Your client is asking you questions about their fitness journey, programming, nutrition, and progress.
You have a UNIFIED view of their training, nutrition, body composition, and goals.

CRITICAL RULES:
1. ALWAYS base your advice on the user's ACTUAL logged data provided below. Never invent or assume data.
2. Be concise, encouraging, and highly technical when discussing programming (volume, intensity, progressive overload).
3. When discussing nutrition, reference their actual intake vs targets. Suggest adjustments if needed.
4. Connect training and nutrition advice — e.g., "You're not eating enough protein to support your volume increase."
5. Format your responses using Markdown (bold, lists, tables) for clarity.
6. When discussing PRs, reference the exact date and numbers from the data.
7. When the user has goals set, actively reference them and provide progress updates.
${profileSection}
# USER'S COMPLETE WORKOUT HISTORY
Total sessions: ${allWorkouts?.length ?? 0}
${goalsSection}
${prSummary}
${nutritionSection}
${weightSection}
## All Sessions (newest first)
${workoutData}
`

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}

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

  const systemPrompt = `You are a world-class, data-driven personal fitness coach.
Your client is asking you questions about their fitness journey, programming, and progress.

CRITICAL RULES:
1. ALWAYS base your advice on the user's ACTUAL logged data provided below. Never invent or assume workouts.
2. Be concise, encouraging, and highly technical when discussing programming (volume, intensity, progressive overload).
3. If the data doesn't contain what the user is asking about, say so clearly.
4. Format your responses using Markdown (bold, lists, tables) for clarity.
5. When discussing PRs, reference the exact date and numbers from the data.
6. For programming advice, consider the user's recent volume, frequency, and progression trends.

# USER'S COMPLETE WORKOUT HISTORY
Total sessions: ${allWorkouts?.length ?? 0}
${prSummary}
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

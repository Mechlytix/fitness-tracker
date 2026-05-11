import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: goals } = await supabase
    .from('user_goals')
    .select('*, exercises(name)')
    .eq('user_id', user.id)
    .order('is_achieved')
    .order('created_at', { ascending: false })

  return Response.json(goals ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabase
    .from('user_goals')
    .insert({
      user_id: user.id,
      goal_type: body.goal_type || 'general',
      title: body.title,
      description: body.description || null,
      target_value: body.target_value || null,
      target_unit: body.target_unit || null,
      exercise_id: body.exercise_id || null,
      deadline: body.deadline || null,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  await supabase.from('user_goals').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ ok: true })
}

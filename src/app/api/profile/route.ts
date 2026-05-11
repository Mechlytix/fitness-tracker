import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data } = await supabase.from('user_profile').select('*').eq('user_id', user.id).single()
  return Response.json(data ?? { onboarded: false })
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { error } = await supabase.from('user_profile').upsert({
    user_id: user.id,
    weight_kg: body.weight_kg ?? null,
    height_cm: body.height_cm ?? null,
    age: body.age ?? null,
    sex: body.sex ?? null,
    activity_level: body.activity_level ?? 1.55,
    goal: body.goal ?? 'maintain',
    onboarded: body.onboarded ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '30')

  const { data } = await supabase
    .from('weight_log')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(limit)

  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { error } = await supabase.from('weight_log').upsert({
    user_id: user.id,
    log_date: body.log_date || new Date().toISOString().slice(0, 10),
    weight_kg: body.weight_kg,
  }, { onConflict: 'user_id,log_date' })

  // Also update profile with latest weight
  if (!error && body.weight_kg) {
    await supabase.from('user_profile').upsert({
      user_id: user.id,
      weight_kg: body.weight_kg,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

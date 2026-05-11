import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('food_log')
    .select('*, food_items(*)')
    .eq('user_id', user.id)
    .eq('log_date', date)
    .order('created_at')

  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabase
    .from('food_log')
    .insert({
      user_id: user.id,
      food_item_id: body.food_item_id,
      log_date: body.log_date || new Date().toISOString().slice(0, 10),
      meal_type: body.meal_type || 'snacks',
      servings: body.servings || 1,
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

  await supabase.from('food_log').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ ok: true })
}

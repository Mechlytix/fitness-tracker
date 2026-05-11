import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')

  let query = supabase
    .from('food_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data } = await query.limit(50)
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabase
    .from('food_items')
    .insert({
      user_id: user.id,
      name: body.name,
      brand: body.brand || null,
      serving_size: body.serving_size || 100,
      serving_unit: body.serving_unit || 'g',
      calories: body.calories || 0,
      protein_g: body.protein_g || 0,
      carbs_g: body.carbs_g || 0,
      fat_g: body.fat_g || 0,
      barcode: body.barcode || null,
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

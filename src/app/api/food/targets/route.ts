import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return Response.json(data ?? { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65 })
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { error } = await supabase
    .from('nutrition_targets')
    .upsert({
      user_id: user.id,
      calories: body.calories ?? 2000,
      protein_g: body.protein_g ?? 150,
      carbs_g: body.carbs_g ?? 250,
      fat_g: body.fat_g ?? 65,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

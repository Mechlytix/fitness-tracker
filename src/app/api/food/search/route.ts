export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')

  if (!q || q.length < 2) {
    return Response.json([])
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments,serving_size,code`,
      { headers: { 'User-Agent': 'FitTrackApp/1.0' } }
    )

    if (!res.ok) return Response.json([])

    const data = await res.json()
    const products = (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments)
      .map((p: any) => {
        const n = p.nutriments
        // Parse serving size - default to 100g
        let servingSize = 100
        let servingUnit = 'g'
        if (p.serving_size) {
          const match = p.serving_size.match(/(\d+\.?\d*)\s*(g|ml|oz)/i)
          if (match) {
            servingSize = parseFloat(match[1])
            servingUnit = match[2].toLowerCase()
          }
        }

        return {
          name: p.product_name,
          brand: p.brands || null,
          barcode: p.code || null,
          serving_size: servingSize,
          serving_unit: servingUnit,
          // Use per-serving values if available, otherwise per-100g
          calories: Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
          protein_g: Math.round((n.proteins_serving ?? n.proteins_100g ?? 0) * 10) / 10,
          carbs_g: Math.round((n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0) * 10) / 10,
          fat_g: Math.round((n.fat_serving ?? n.fat_100g ?? 0) * 10) / 10,
        }
      })

    return Response.json(products)
  } catch {
    return Response.json([])
  }
}

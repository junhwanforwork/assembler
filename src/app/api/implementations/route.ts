import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const IMPL_SELECT = `
  id, headline, device_type, industry_id, feature_type_id, tags, created_at, view_count,
  product:products(id, slug, name, logo_url, brand_color),
  feature_type:feature_types(name, slug),
  industry:industries(name, icon)
`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const feature_type = searchParams.get('feature_type')
  const industry = searchParams.get('industry')
  const device = searchParams.get('device')
  const q = searchParams.get('q')

  const supabase = await createClient()

  let query = supabase
    .from('implementations')
    .select(IMPL_SELECT, { count: 'exact' })
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (feature_type) query = query.eq('feature_type_id', feature_type)
  if (industry) query = query.eq('industry_id', industry)
  if (device) query = query.eq('device_type', device)
  if (q) query = query.or(`headline.ilike.%${q}%,tags.cs.{${q}}`)

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/implementations]', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

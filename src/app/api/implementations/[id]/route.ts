import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const IMPL_DETAIL_SELECT = `
  id, headline, device_type, industry_id, feature_type_id, tags, created_at, view_count,
  feature_areas, plain_notes, pros, cons, best_for, setup_guide, source_url,
  product:products(id, slug, name, logo_url, brand_color),
  feature_type:feature_types(name, slug),
  industry:industries(name, icon)
`

const IMPL_CARD_SELECT = `
  id, headline, device_type, tags, created_at,
  product:products(id, slug, name, logo_url, brand_color),
  feature_type:feature_types(name, slug),
  industry:industries(name, icon)
`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: impl, error } = await supabase
    .from('implementations')
    .select(IMPL_DETAIL_SELECT)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !impl) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // similar: same feature_type, different product, max 3
  const { data: similar } = await supabase
    .from('implementations')
    .select(IMPL_CARD_SELECT)
    .eq('is_published', true)
    .eq('feature_type_id', impl.feature_type_id ?? '')
    .neq('product_id', (impl.product as { id: string } | null)?.id ?? '')
    .neq('id', id)
    .limit(3)

  return NextResponse.json({ data: impl, similar: similar ?? [] })
}

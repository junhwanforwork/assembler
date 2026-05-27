import { createClient } from '@/lib/supabase/server'
import { ImplWithProduct } from '@/types'
import ImplementationGrid from '@/components/feed/ImplementationGrid'

const IMPL_SELECT = `
  id, headline, device_type, industry_id, feature_type_id, tags, created_at, view_count,
  product:products(id, slug, name, logo_url, brand_color),
  feature_type:feature_types(name, slug),
  industry:industries(name, icon)
`

interface PageProps {
  searchParams: Promise<{
    feature_type?: string
    industry?: string
    device?: string
    q?: string
  }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // industry_id 조회 (slug → id)
  let industryId: string | null = null
  if (params.industry) {
    const { data } = await supabase
      .from('industries')
      .select('id')
      .eq('slug', params.industry)
      .single()
    industryId = data?.id ?? null
  }

  let query = supabase
    .from('implementations')
    .select(IMPL_SELECT, { count: 'exact' })
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (params.feature_type) query = query.eq('feature_type_id', params.feature_type)
  if (industryId) query = query.eq('industry_id', industryId)
  if (params.device) query = query.eq('device_type', params.device)
  if (params.q) query = query.ilike('headline', `%${params.q}%`)

  const { data, count } = await query
  const impls = (data ?? []) as unknown as ImplWithProduct[]

  return <ImplementationGrid impls={impls} total={count ?? 0} />
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImplWithProduct } from '@/types'
import ImplHeader from '@/components/impl/ImplHeader'
import ImplDetailTabs from '@/components/impl/ImplDetailTabs'
import FeatureSpecSection from '@/components/impl/FeatureSpecSection'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ImplDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: impl } = await supabase
    .from('implementations')
    .select('*, product:products(id,slug,name,logo_url,brand_color), feature_type:feature_types(name,slug), industry:industries(name,icon)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!impl) notFound()

  // fire-and-forget view count increment
  void supabase
    .from('implementations')
    .update({ view_count: (impl.view_count ?? 0) + 1 })
    .eq('id', id)

  const productId = (impl as unknown as { product?: { id?: string } }).product?.id ?? ''

  const { data: similarRaw } = await supabase
    .from('implementations')
    .select('id,headline,device_type,created_at,tags,feature_type_id,industry_id,product:products(id,slug,name,logo_url,brand_color),feature_type:feature_types(name,slug),industry:industries(name,icon)')
    .eq('feature_type_id', impl.feature_type_id ?? '')
    .neq('product_id', productId)
    .eq('is_published', true)
    .limit(3)

  const similar = (similarRaw ?? []) as unknown as ImplWithProduct[]
  const typedImpl = impl as unknown as ImplWithProduct

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <ImplHeader impl={typedImpl} />
      <FeatureSpecSection features={typedImpl.features ?? []} />
      <ImplDetailTabs impl={typedImpl} similar={similar} />
    </div>
  )
}

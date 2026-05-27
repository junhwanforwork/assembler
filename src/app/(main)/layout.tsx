import GNB from '@/components/layout/GNB'
import FeatureSidebar from '@/components/layout/FeatureSidebar'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: featureTypes } = await supabase
    .from('feature_types')
    .select('id, name, slug, order_index')
    .order('order_index', { ascending: true })

  const { data: counts } = await supabase
    .from('implementations')
    .select('feature_type_id')
    .eq('is_published', true)

  const countMap: Record<string, number> = {}
  counts?.forEach(i => {
    if (i.feature_type_id) {
      countMap[i.feature_type_id] = (countMap[i.feature_type_id] ?? 0) + 1
    }
  })

  const featureTypesWithCount = (featureTypes ?? []).map(ft => ({
    ...ft,
    count: countMap[ft.id] ?? 0,
  }))

  const total = counts?.length ?? 0

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <GNB />
      <div className="flex flex-1 max-w-[1440px] mx-auto w-full px-6 gap-6 pt-6">
        <FeatureSidebar featureTypes={featureTypesWithCount} total={total} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

import { createClient } from '@supabase/supabase-js'
import { ImplWithProduct } from '@/types'
import AdminImplList from '@/components/admin/AdminImplList'

export default async function AdminPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const select = '*, product:products(id,slug,name,logo_url,brand_color), feature_type:feature_types(name,slug), industry:industries(name,icon)'

  const [{ data: unpublishedRaw }, { data: publishedRaw }] = await Promise.all([
    supabase.from('implementations').select(select).eq('is_published', false).order('created_at', { ascending: false }),
    supabase.from('implementations').select(select).eq('is_published', true).order('created_at', { ascending: false }),
  ])

  const unpublished = (unpublishedRaw ?? []) as unknown as ImplWithProduct[]
  const published = (publishedRaw ?? []) as unknown as ImplWithProduct[]

  return <AdminImplList unpublished={unpublished} published={published} />
}

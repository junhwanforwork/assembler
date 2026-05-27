import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SharedWorkspaceView from '@/components/share/SharedWorkspaceView'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('workspace_shares')
    .select('id, slug, snapshot, created_at')
    .eq('slug', slug)
    .single()

  if (!data) notFound()

  return <SharedWorkspaceView slug={slug} snapshot={data.snapshot} />
}

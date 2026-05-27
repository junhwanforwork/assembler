import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest, createAdminClient } from '@/lib/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as { is_published?: boolean }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('implementations')
    .update({ is_published: body.is_published ?? true })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

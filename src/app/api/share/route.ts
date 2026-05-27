import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id')
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })

  const body = await request.json() as { snapshot: unknown }

  if (body.snapshot === undefined) {
    return NextResponse.json({ error: 'missing_snapshot' }, { status: 400 })
  }

  const supabase = await createClient()
  const slug = nanoid(8)

  const { data, error } = await supabase
    .from('workspace_shares')
    .insert({
      session_id: sessionId,
      slug,
      snapshot: body.snapshot as import('@/types/database.types').Json,
    })
    .select('slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ slug: data.slug }, { status: 201 })
}

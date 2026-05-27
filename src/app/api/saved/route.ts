import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id')
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })

  const supabase = await createClient({ headers: { 'x-session-id': sessionId } })

  const { data, error } = await supabase
    .from('saved_items')
    .select(`
      id,
      note,
      created_at,
      implementation:implementations (
        id,
        headline,
        device_type,
        product:products (
          id,
          slug,
          name,
          logo_url,
          brand_color
        ),
        feature_type:feature_types (
          name,
          slug
        ),
        industry:industries (
          name,
          icon
        )
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id')
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })

  const body = await request.json() as { implementation_id: string; note?: string }

  if (!body.implementation_id) {
    return NextResponse.json({ error: 'missing_implementation_id' }, { status: 400 })
  }

  const supabase = await createClient({ headers: { 'x-session-id': sessionId } })

  // Duplicate check: same session_id + implementation_id
  const { data: existing, error: checkError } = await supabase
    .from('saved_items')
    .select('*')
    .eq('session_id', sessionId)
    .eq('implementation_id', body.implementation_id)
    .maybeSingle()

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ data: existing, duplicate: true }, { status: 200 })
  }

  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      session_id: sessionId,
      implementation_id: body.implementation_id,
      note: body.note ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id')
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  const supabase = await createClient({ headers: { 'x-session-id': sessionId } })

  // Ownership check: only the session that created this item can delete it
  const { data: item, error: fetchError } = await supabase
    .from('saved_items')
    .select('id, session_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (item.session_id !== sessionId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

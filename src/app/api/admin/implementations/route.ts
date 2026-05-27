import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest, createAdminClient } from '@/lib/admin'
import type { TablesInsert, Json } from '@/types/database.types'

const DEVICE_TYPES = ['mobile_app', 'web', 'kiosk', 'tablet_pos', 'dashboard']

interface ImplBody {
  product_id?: string
  headline?: string
  feature_type_id?: string
  industry_id?: string
  device_type?: string
  feature_areas?: unknown
  features?: unknown
  plain_notes?: string
  pros?: unknown
  cons?: unknown
  best_for?: string
  setup_guide?: unknown
  tags?: unknown
  is_published?: boolean
}

// string[] 로 들어왔는지 확인. 아니면 null.
function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const arr = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  return arr.length > 0 ? arr : null
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: ImplBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const productId = body.product_id?.trim()
  const headline = body.headline?.trim()
  const deviceType = body.device_type?.trim()

  if (!productId) return NextResponse.json({ error: 'product_required' }, { status: 400 })
  if (!headline) return NextResponse.json({ error: 'headline_required' }, { status: 400 })
  if (deviceType && !DEVICE_TYPES.includes(deviceType)) {
    return NextResponse.json({ error: 'invalid_device_type' }, { status: 400 })
  }
  if (body.feature_areas !== undefined && !Array.isArray(body.feature_areas)) {
    return NextResponse.json({ error: 'invalid_feature_areas' }, { status: 400 })
  }
  if (body.features !== undefined && !Array.isArray(body.features)) {
    return NextResponse.json({ error: 'invalid_features' }, { status: 400 })
  }
  if (body.setup_guide !== undefined && body.setup_guide !== null && !Array.isArray(body.setup_guide)) {
    return NextResponse.json({ error: 'invalid_setup_guide' }, { status: 400 })
  }

  const insert: TablesInsert<'implementations'> = {
    product_id: productId,
    headline,
    feature_type_id: body.feature_type_id?.trim() || null,
    industry_id: body.industry_id?.trim() || null,
    device_type: deviceType || null,
    feature_areas: (Array.isArray(body.feature_areas) ? body.feature_areas : []) as Json,
    features: (Array.isArray(body.features) ? body.features : []) as Json,
    plain_notes: body.plain_notes?.trim() || null,
    pros: asStringArray(body.pros) as Json,
    cons: asStringArray(body.cons) as Json,
    best_for: body.best_for?.trim() || null,
    setup_guide: (Array.isArray(body.setup_guide) ? body.setup_guide : null) as Json,
    tags: asStringArray(body.tags),
    is_published: body.is_published ?? false,
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('implementations')
    .insert(insert)
    .select('id, headline')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

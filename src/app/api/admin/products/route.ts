import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest, createAdminClient } from '@/lib/admin'
import type { TablesInsert } from '@/types/database.types'

const SLUG_RE = /^[a-z0-9-]+$/
const HEX_RE = /^#[0-9a-fA-F]{6}$/

interface ProductBody {
  name?: string
  slug?: string
  brand_color?: string
  logo_url?: string
  industry_id?: string
  website_url?: string
  description?: string
  is_published?: boolean
}

// 어드민 — 전체 상품 목록 (미발행 포함). 구현 생성 폼 드롭다운에서 사용.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, brand_color, logo_url, industry_id, is_published')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: ProductBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = body.name?.trim()
  const slug = body.slug?.trim().toLowerCase()
  const brandColor = body.brand_color?.trim()

  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'slug_required' }, { status: 400 })
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  if (brandColor && !HEX_RE.test(brandColor)) {
    return NextResponse.json({ error: 'invalid_color' }, { status: 400 })
  }

  const insert: TablesInsert<'products'> = {
    name,
    slug,
    brand_color: brandColor || null,
    logo_url: body.logo_url?.trim() || null,
    industry_id: body.industry_id?.trim() || null,
    website_url: body.website_url?.trim() || null,
    description: body.description?.trim() || null,
    is_published: body.is_published ?? true,
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .insert(insert)
    .select('id, slug, name')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

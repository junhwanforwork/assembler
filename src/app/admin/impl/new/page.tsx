import Link from 'next/link'
import { createAdminClient } from '@/lib/admin'
import ImplForm, { type RefOption } from '@/components/admin/ImplForm'

export default async function NewImplPage() {
  const supabase = createAdminClient()
  const [{ data: products }, { data: featureTypes }, { data: industries }] = await Promise.all([
    supabase.from('products').select('id, name').order('created_at', { ascending: false }),
    supabase.from('feature_types').select('id, name').order('order_index', { ascending: true }),
    supabase.from('industries').select('id, name').order('name'),
  ])

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ← 어드민
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
          구현 추가
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          상품에 구현 사례를 등록해요. 기본은 미발행이에요
        </p>
      </div>
      {(products ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          먼저 상품을 추가해 주세요.{' '}
          <Link href="/admin/products/new" style={{ color: 'var(--accent)' }}>
            상품 추가하기 →
          </Link>
        </p>
      ) : (
        <ImplForm
          products={(products ?? []) as RefOption[]}
          featureTypes={(featureTypes ?? []) as RefOption[]}
          industries={(industries ?? []) as RefOption[]}
        />
      )}
    </div>
  )
}

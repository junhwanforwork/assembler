import Link from 'next/link'
import { createAdminClient } from '@/lib/admin'
import ProductForm, { type IndustryOption } from '@/components/admin/ProductForm'

export default async function NewProductPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('industries').select('id, name').order('name')
  const industries = (data ?? []) as IndustryOption[]

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          ← 어드민
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
          상품 추가
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          새 브랜드나 서비스를 등록해요
        </p>
      </div>
      <ProductForm industries={industries} />
    </div>
  )
}

'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSearch } from '@/hooks/useSearch'

interface FeatureSidebarProps {
  featureTypes?: Array<{ id: string; name: string; slug: string; count: number }>
  total?: number
}

export default function FeatureSidebar({ featureTypes = [], total = 0 }: FeatureSidebarProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const active = searchParams.get('feature_type')
  const { value, onChange } = useSearch()

  function selectFeature(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('feature_type', id)
    else params.delete('feature_type')
    params.delete('q')
    router.replace(`/?${params.toString()}`)
  }

  return (
    <aside className="w-[260px] flex-shrink-0 flex-col gap-4 pb-8 hidden lg:flex">
      {/* 검색 */}
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="기능·서비스 검색"
          className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        />
      </div>

      {/* 기능 필터 */}
      <div className="flex flex-col">
        <p
          className="text-xs font-semibold mb-2 uppercase tracking-wider px-1"
          style={{ color: 'var(--text-muted)' }}
        >
          기능
        </p>

        {/* 전체 */}
        <button
          onClick={() => selectFeature(null)}
          className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left"
          style={{
            color: !active ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: !active ? 'var(--bg-elevated)' : 'transparent',
            fontWeight: !active ? 600 : 400,
          }}
        >
          <span>전체</span>
          <span style={{ color: 'var(--text-muted)' }}>{total}</span>
        </button>

        {featureTypes.map(ft => (
          <button
            key={ft.id}
            onClick={() => selectFeature(ft.id)}
            className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left"
            style={{
              color: active === ft.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active === ft.id ? 'var(--bg-elevated)' : 'transparent',
              fontWeight: active === ft.id ? 600 : 400,
            }}
          >
            <span>{ft.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>{ft.count}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

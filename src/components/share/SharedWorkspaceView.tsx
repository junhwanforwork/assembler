import Link from 'next/link'

interface SnapshotItem {
  id: string
  implementation_id: string
  implementation?: {
    headline: string
    product?: { name: string; brand_color: string | null }
    feature_type?: { name: string } | null
  }
}

interface SharedWorkspaceViewProps {
  slug: string
  snapshot: unknown
}

export default function SharedWorkspaceView({ slug: _slug, snapshot }: SharedWorkspaceViewProps) {
  const items = (Array.isArray(snapshot) ? snapshot : []) as SnapshotItem[]

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          공유된 앱 기획
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          선택된 기능 {items.length}개
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          이 기획을 참고해서 개발할 수 있어요
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>저장된 기능이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-10">
          {items.map((item, i) => (
            <div
              key={item.id ?? i}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: item.implementation?.product?.brand_color ?? 'var(--bg-elevated)',
                  color: 'var(--text-inverse)',
                }}
              >
                {item.implementation?.product?.name?.[0] ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.implementation?.headline ?? '구현 정보 없음'}
                </p>
                {item.implementation?.product?.name && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.implementation.product.name}
                    {item.implementation?.feature_type?.name &&
                      ` · ${item.implementation.feature_type.name}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="rounded-xl p-6 text-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          나도 내 서비스를 기획해볼게요
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          HowCloud에서 시작하기 →
        </Link>
      </div>
    </div>
  )
}

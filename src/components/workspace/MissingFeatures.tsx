import Link from 'next/link'

const ALL_FEATURE_TYPES = [
  '포인트 적립', '예약', '결제', '알림', '회원가입', '리뷰', '쿠폰', '회원권',
]

interface MissingFeaturesProps {
  savedFeatureTypeIds: (string | null)[]
}

export default function MissingFeatures({ savedFeatureTypeIds: _savedFeatureTypeIds }: MissingFeaturesProps) {
  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
        추가로 고려해볼 기능
      </p>
      <div className="flex flex-wrap gap-2">
        {ALL_FEATURE_TYPES.map((name) => (
          <Link
            key={name}
            href={`/?feature_type=${encodeURIComponent(name)}`}
            className="text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {name} →
          </Link>
        ))}
      </div>
    </div>
  )
}

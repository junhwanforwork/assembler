'use client'
import Link from 'next/link'
import { SavedItem } from '@/types'

interface SavedItemCardProps {
  item: SavedItem
  onRemove: (id: string) => void
}

export default function SavedItemCard({ item, onRemove }: SavedItemCardProps) {
  const impl = item.implementation
  const brandColor = impl?.product?.brand_color ?? 'var(--bg-elevated)'
  const initial = impl?.product?.name?.[0] ?? '?'

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Brand strip */}
      <div
        className="h-16 flex items-center px-4 gap-3"
        style={{ background: brandColor }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--overlay-dark-alpha)', color: 'var(--text-inverse)' }}
        >
          {initial}
        </div>
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-inverse)' }}>
          {impl?.product?.name}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {impl?.headline ?? '구현 정보 없음'}
        </p>
        {impl?.feature_type && (
          <span
            className="text-xs px-2 py-0.5 rounded-full self-start"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            {impl.feature_type.name}
          </span>
        )}
        {item.note && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.note}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2">
        {impl && (
          <Link
            href={`/impl/${impl.id}`}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            상세 보기
          </Link>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors ml-auto"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          삭제하기
        </button>
      </div>
    </div>
  )
}

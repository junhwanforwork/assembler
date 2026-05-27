'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSavedStore } from '@/stores/savedStore'
import { getSessionId } from '@/lib/session'
import { SavedItem } from '@/types'
import SavedItemCard from './SavedItemCard'
import ProgressStatus from './ProgressStatus'
import MissingFeatures from './MissingFeatures'
import ShareButton from './ShareButton'

export default function WorkspaceBoard() {
  const { items, setItems, removeItem } = useSavedStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionId = getSessionId()
    if (!sessionId) {
      setLoading(false)
      return
    }

    fetch('/api/saved', {
      headers: { 'x-session-id': sessionId },
    })
      .then((res) => res.json())
      .then((json: { data?: SavedItem[] }) => {
        if (json.data) setItems(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [setItems])

  async function handleRemove(id: string) {
    const sessionId = getSessionId()
    await fetch(`/api/saved?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-session-id': sessionId },
    })
    removeItem(id)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            내 앱 만들기
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            저장한 기능들로 내 서비스를 조립해요
          </p>
        </div>
        <ShareButton />
      </div>

      {/* Progress status */}
      <ProgressStatus count={items.length} />

      {/* Saved items grid */}
      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>불러오는 중이에요...</div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            아직 저장한 기능이 없어요. 마음에 드는 구현을 저장해 보세요.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            구현 둘러보기 →
          </Link>
        </div>
      ) : (
        <div
          className="grid gap-4 mb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {items.map((item) => (
            <SavedItemCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Missing features suggestion */}
      {items.length > 0 && (
        <MissingFeatures
          savedFeatureTypeIds={items.map((i) => i.implementation?.feature_type_id ?? null)}
        />
      )}
    </div>
  )
}

'use client'
import Link from 'next/link'
import { useSavedStore } from '@/stores/savedStore'

export default function GNBSavedBadge() {
  const count = useSavedStore(s => s.items.length)
  if (count === 0) return null
  return (
    <Link
      href="/workspace"
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span>★</span>
      <span>{count} 저장</span>
    </Link>
  )
}

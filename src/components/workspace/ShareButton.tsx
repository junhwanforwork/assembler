'use client'
import { useState } from 'react'
import { useSavedStore } from '@/stores/savedStore'
import { getSessionId } from '@/lib/session'

export default function ShareButton() {
  const { items } = useSavedStore()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function handleShare() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const sessionId = getSessionId()
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ session_id: sessionId, snapshot: items }),
      })
      const json = await res.json() as { slug?: string; error?: string }
      if (json.slug) {
        const url = `${window.location.origin}/share/${json.slug}`
        await navigator.clipboard.writeText(url)
        showToast('링크를 복사했어요')
      } else {
        showToast('잠시 후 다시 시도해 주세요')
      }
    } catch {
      showToast('잠시 후 다시 시도해 주세요')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (items.length === 0) return null

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        style={{
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '생성 중...' : '공유 링크 만들기'}
      </button>
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

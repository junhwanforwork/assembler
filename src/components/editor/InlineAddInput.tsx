"use client"

import { useRef, useState } from "react"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import s from "./InlineAddInput.module.css"

// 인라인 추가 상태 공용 훅 — 열기/저장 중/실패를 한 묶음으로. save가 null을 주면 성공으로 닫는다.
export function useInlineAdd(save: (text: string) => Promise<DesignPatchFailure | null>) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<DesignPatchFailure | null>(null)

  const open = () => {
    setAdding(true)
    setFailure(null)
  }
  const cancel = () => {
    setAdding(false)
    setFailure(null)
  }
  const commit = async (text: string) => {
    setSaving(true)
    setFailure(null)
    try {
      const fail = await save(text)
      if (fail) {
        setFailure(fail)
        return
      }
      setAdding(false)
    } catch {
      // save 콜백(후처리 포함)이 던져도 saving이 고착되지 않게 — 사용자에겐 일반 오류로.
      setFailure({ ok: false, kind: "generic" })
    } finally {
      setSaving(false)
    }
  }

  return { adding, saving, failure, open, cancel, commit }
}

// 인라인 추가 입력(#30·#37·#42 공용) — Enter/바깥 클릭=확정, Esc=취소, 빈 문자열=취소(계약).
// 저장 성공 여부·에러 표시는 부모 몫 — 실패하면 부모가 이 입력을 열어둔 채 에러를 보여준다.
// 실패 후 바깥 클릭은 재시도가 아니라 포기(취소) — 같은 텍스트가 blur로 재발사되지 않게.
export function InlineAddInput({
  placeholder,
  ariaLabel,
  saving = false,
  hasError = false,
  onCommit,
  onCancel,
}: {
  placeholder: string
  ariaLabel: string
  saving?: boolean
  hasError?: boolean
  onCommit: (text: string) => Promise<void>
  onCancel: () => void
}) {
  const [text, setText] = useState("")
  // Enter 확정 직후 blur가 겹쳐 두 번 저장되지 않게 진행 중 커밋을 잠근다.
  const pending = useRef(false)

  const commit = async () => {
    if (pending.current || saving) return
    const trimmed = text.trim()
    if (!trimmed) {
      onCancel()
      return
    }
    pending.current = true
    try {
      await onCommit(trimmed)
    } finally {
      pending.current = false
    }
  }

  return (
    <input
      className={s.input}
      autoFocus
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={saving}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") void commit()
        if (e.key === "Escape") onCancel()
      }}
      onBlur={() => (hasError ? onCancel() : void commit())}
    />
  )
}

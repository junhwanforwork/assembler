"use client"

import { useRef, useState } from "react"
import { clsx } from "clsx"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import { PatchErrorNote } from "./PatchErrorNote"
import s from "./InlineEditText.module.css"

// 인라인 편집 상태 훅 — useInlineAdd의 "기존 값 수정"판. save가 null(성공)이면 닫고, 실패면 열어둔다.
// 포커스 복원은 useInlineAdd와 동일 규약(트리거로 되돌려 키보드 사용자가 위치를 잃지 않게).
export function useInlineEdit(save: (value: string) => Promise<DesignPatchFailure | null>) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<DesignPatchFailure | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const restoreFocus = () => {
    const opener = openerRef.current
    openerRef.current = null
    if (!opener) return
    requestAnimationFrame(() => {
      // 사용자가 이미 다른 요소로 옮겼으면 강탈하지 않는다(진행 중 타이핑·방금 연 입력 보호).
      const active = document.activeElement
      if (active && active !== document.body) return
      if (opener.isConnected) opener.focus()
    })
  }

  const open = () => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEditing(true)
    setFailure(null)
  }
  const cancel = () => {
    setEditing(false)
    setFailure(null)
    restoreFocus()
  }
  const commit = async (value: string) => {
    setSaving(true)
    setFailure(null)
    try {
      const fail = await save(value)
      if (fail) {
        setFailure(fail)
        return
      }
      setEditing(false)
      restoreFocus()
    } catch {
      // save 콜백이 던져도 saving 고착되지 않게 — 사용자에겐 일반 오류로.
      setFailure({ ok: false, kind: "generic" })
    } finally {
      setSaving(false)
    }
  }

  return { editing, saving, failure, open, cancel, commit }
}

// 편집 필드 — 초기값(현재 저장본) 프리필. 제목/이름은 required(빈 값=되돌림), 설명은 빈 허용(지우기).
// 값이 그대로면 저장하지 않고 조용히 닫는다(무변경 스킵 → 불필요 PATCH 0). 실패 후 blur는 포기(취소).
function InlineEditField({
  value,
  ariaLabel,
  saving,
  hasError,
  required,
  multiline,
  placeholder,
  onCommit,
  onCancel,
}: {
  value: string
  ariaLabel: string
  saving: boolean
  hasError: boolean
  required: boolean
  multiline: boolean
  placeholder?: string
  onCommit: (value: string) => Promise<void>
  onCancel: () => void
}) {
  const [text, setText] = useState(value)
  // Enter 확정 직후 blur가 겹쳐 두 번 저장되지 않게 잠근다.
  const pending = useRef(false)

  const commit = async () => {
    if (pending.current || saving) return
    const trimmed = text.trim()
    // 필수 필드(제목·이름)는 비울 수 없다 → 되돌림. 설명(!required)은 빈 값으로 지우기 허용.
    if (required && !trimmed) {
      onCancel()
      return
    }
    // 무변경이면 저장하지 않는다 — null 반환→stale 오탐을 피하고 불필요 PATCH를 막는다.
    if (trimmed === value.trim()) {
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

  if (multiline) {
    return (
      <textarea
        className={s.textarea}
        autoFocus
        rows={3}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={saving}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // 여러 줄 — Enter는 줄바꿈, Cmd/Ctrl+Enter=확정, Esc=취소.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void commit()
          if (e.key === "Escape") onCancel()
        }}
        onBlur={() => (hasError ? onCancel() : void commit())}
      />
    )
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

// 인라인 편집 텍스트 — 표시(클릭→편집) ↔ 편집(초기값 프리필) 전환. 저장·에러 표시까지 자체 처리.
// 표시 스타일(제목=헤딩, 설명=본문)은 displayClassName으로 부모가 결정한다.
export function InlineEditText({
  value,
  ariaLabel,
  onSave,
  required = false,
  multiline = false,
  placeholder,
  emptyLabel = "비어 있어요",
  displayClassName,
  staleText = "이 항목을 찾을 수 없어요. 목록을 다시 확인해 주세요.",
}: {
  value: string
  ariaLabel: string
  onSave: (value: string) => Promise<DesignPatchFailure | null>
  required?: boolean
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  displayClassName?: string
  staleText?: string
}) {
  const edit = useInlineEdit(onSave)

  if (!edit.editing) {
    return (
      <button
        type="button"
        className={clsx(s.display, !value && s.displayEmpty, displayClassName)}
        aria-label={`${ariaLabel} 편집`}
        onClick={edit.open}
      >
        {value || emptyLabel}
      </button>
    )
  }

  return (
    <div className={s.editWrap}>
      <InlineEditField
        value={value}
        ariaLabel={ariaLabel}
        saving={edit.saving}
        hasError={!!edit.failure}
        required={required}
        multiline={multiline}
        placeholder={placeholder}
        onCommit={edit.commit}
        onCancel={edit.cancel}
      />
      {edit.failure && (
        <div className={s.note}>
          <PatchErrorNote failure={edit.failure} staleText={staleText} />
        </div>
      )}
    </div>
  )
}

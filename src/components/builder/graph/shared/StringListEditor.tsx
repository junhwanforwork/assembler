"use client"

import { useCallback, useEffect, useRef, useState, type FC } from "react"
import { TextInput, Button } from "@/components/ui"
import { SPACING } from "@/lib/design-tokens"
import { InlineDeleteButton } from "./InlineDeleteButton"

// string[] 필드(businessRules, Database.columns) 인라인 편집.
// 로컬 버퍼로 키 입력마다 store를 건드리지 않고, 편집은 debounce·삭제/추가는 즉시 커밋한다.
// debounce 중 blur·언마운트 시 pendingRef를 flush(CommittingField와 동일 — 마지막 입력 유실 방지).
const COMMIT_DELAY_MS = 300

type StringListEditorProps = {
  /** 편집 대상 객체 id — 바뀔 때만 로컬 재시드(같은 객체 편집 중 커서 점프 방지). */
  seedKey: string
  items: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  addLabel: string
  /** 삭제 aria-label 접두. 예: "비즈니스 규칙" → "비즈니스 규칙 1 삭제" */
  itemNoun: string
}

export const StringListEditor: FC<StringListEditorProps> = ({
  seedKey,
  items,
  onChange,
  placeholder,
  addLabel,
  itemNoun,
}) => {
  const [local, setLocal] = useState(items)
  const [prevSeed, setPrevSeed] = useState(seedKey)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<string[] | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // debounce 타이머·pending을 비우고 마지막 값을 커밋. blur·언마운트 보호.
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingRef.current !== null) {
      const next = pendingRef.current
      pendingRef.current = null
      onChangeRef.current(next)
    }
  }, [])
  useEffect(() => flush, [flush]) // 언마운트 시 펜딩 커밋 보존

  // 대상 객체가 바뀔 때만 재시드(React 공식 "prop 변화 시 state 리셋" 패턴 — 렌더 중 1회).
  // 같은 객체 편집 중엔 리셋 안 함 → store 왕복으로 인한 커서 점프 방지.
  if (seedKey !== prevSeed) {
    setPrevSeed(seedKey)
    setLocal(items)
  }

  const editDebounced = (next: string[]) => {
    setLocal(next)
    pendingRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, COMMIT_DELAY_MS)
  }
  // 추가/삭제는 즉시 커밋 — 진행 중 debounce는 setLocal로 이미 local에 반영돼 next에 포함되므로 pending 폐기.
  const commitNow = (next: string[]) => {
    setLocal(next)
    pendingRef.current = null
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    onChangeRef.current(next)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      {/* key=index: string[]에 안정 id가 없어 불가피. 삭제 시 하위 행 인덱스 이동 — 값은 controlled라 정확, IME 조합 중 삭제만 주의(아이템 id화는 후속). */}
      {local.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: SPACING["2"], alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              value={item}
              onChange={(v) => editDebounced(local.map((it, idx) => (idx === i ? v : it)))}
              onBlur={flush}
              placeholder={placeholder}
              size="sm"
            />
          </div>
          <InlineDeleteButton
            label={`${itemNoun} ${i + 1} 삭제`}
            onClick={() => commitNow(local.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
      <div>
        <Button variant="ghost" size="sm" onClick={() => commitNow([...local, ""])}>
          {addLabel}
        </Button>
      </div>
    </div>
  )
}

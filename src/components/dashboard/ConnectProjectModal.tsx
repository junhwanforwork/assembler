"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import s from "./dashboard.module.css"

// 프로젝트 연결 — 지금은 이름으로 빈 프로젝트 생성. 코드(API·DB) 자동 연결은 이후.
export function ConnectProjectModal({
  creating,
  onClose,
  onCreate,
}: {
  creating: boolean
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState("")
  const canCreate = name.trim().length > 0 && !creating

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalTitle}>프로젝트 연결</div>
        <p className={s.modalSub}>프로젝트 이름을 정해 주세요. 코드(API·DB) 자동 연결은 곧 지원해요.</p>
        <input
          className={s.input}
          placeholder="예: 산책 메이트 앱"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) onCreate(name.trim())
          }}
        />
        <div className={s.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            닫기
          </Button>
          <Button variant="filled" loading={creating} disabled={!canCreate} onClick={() => onCreate(name.trim())}>
            연결하기
          </Button>
        </div>
      </div>
    </div>
  )
}

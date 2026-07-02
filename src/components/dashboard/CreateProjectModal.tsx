"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import s from "./dashboard.module.css"

// 프로젝트 만들기 — 이름으로 빈 프로젝트를 만든다(정직한 명칭·버튼).
// pendingIdea가 있으면(컴포저에서 프로젝트 없이 제출) 아이디어를 미리보기로
// 보여줘 "만들면 이 아이디어로 이어진다"를 보장한다(경로 C).
export function CreateProjectModal({
  creating,
  pendingIdea,
  onClose,
  onCreate,
}: {
  creating: boolean
  pendingIdea: string | null
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState("")
  const canCreate = name.trim().length > 0 && !creating

  return (
    <Modal labelledBy="create-project-title" onClose={onClose} closeDisabled={creating}>
      <div className={s.modalTitle} id="create-project-title">
        프로젝트 만들기
      </div>
      <p className={s.modalSub}>
        {pendingIdea
          ? "프로젝트 이름을 정하면 적어 준 아이디어로 바로 첫 스펙을 만들어 드려요."
          : "프로젝트 이름을 정해 주세요."}
      </p>
      {pendingIdea && <blockquote className={s.ideaPreview}>{pendingIdea}</blockquote>}
      <input
        className={s.input}
        placeholder="예: 산책 메이트 앱"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          // isComposing 가드 — 한글 조합 확정 Enter가 곧바로 제출되지 않게.
          if (e.key === "Enter" && !e.nativeEvent.isComposing && canCreate) onCreate(name.trim())
        }}
      />
      <div className={s.modalActions}>
        <Button variant="ghost" onClick={onClose} disabled={creating}>
          닫기
        </Button>
        <Button variant="filled" loading={creating} disabled={!canCreate} onClick={() => onCreate(name.trim())}>
          만들기
        </Button>
      </div>
    </Modal>
  )
}

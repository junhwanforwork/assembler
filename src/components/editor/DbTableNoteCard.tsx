"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useDbTableNote } from "@/hooks/useDbTableNote"
import { errorMessage } from "@/lib/api/messages"
import s from "./editor.module.css"

// DB Learning — 인스펙터 안 'AI 설명' 섹션.
// 사실(컬럼·관계, 위쪽 섹션)과 분리된 추론 레이어 → 'AI 추정' 배지로 하위임을 명시하고 편집 가능하게 둔다.
// grounded=false(보수적)면 그 사실을 한 줄로 알려 사용자가 신뢰도를 가늠하게 한다.
export function DbTableNoteCard({ workspaceId, tableId }: { workspaceId: string; tableId: string }) {
  const { note, status, error, generate, save } = useDbTableNote(workspaceId, tableId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const startEdit = () => {
    setDraft(note?.explanation ?? "")
    setEditing(true)
  }
  const submitEdit = async () => {
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    // 저장 성공 시에만 닫는다 — 실패면 에디터를 유지해 입력(draft)을 잃지 않고 에러를 보여준다.
    const ok = await save(trimmed)
    if (ok) setEditing(false)
  }

  return (
    <div className={s.inspSec}>
      <div className={s.aiHead}>
        <span className={s.inspH}>AI 설명</span>
        <Badge tone="brand">AI 추정</Badge>
      </div>

      {status === "loading" ? (
        <div className={s.aiMuted}>불러오는 중이에요…</div>
      ) : editing ? (
        <div className={s.aiEdit}>
          <textarea
            className={s.aiTextarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="이 테이블이 무엇을 담는지 적어 주세요."
            aria-label="AI 설명 편집"
            rows={4}
            autoFocus
          />
          {status === "error" && <div className={s.aiMuted}>{errorMessage(error)}</div>}
          <div className={s.aiActions}>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={status === "saving"}>
              닫기
            </Button>
            <Button variant="filled" size="sm" onClick={submitEdit} loading={status === "saving"} disabled={draft.trim().length === 0}>
              저장하기
            </Button>
          </div>
        </div>
      ) : note ? (
        <div>
          <p className={s.aiText}>{note.explanation}</p>
          {!note.grounded && <div className={s.aiConservative}>연결 정보가 적어 보수적으로 추정했어요.</div>}
          {note.isUserEdited && <div className={s.aiMeta}>직접 편집한 설명이에요.</div>}
          {status === "error" && <div className={s.aiMuted}>{errorMessage(error)}</div>}
          <div className={s.aiActions}>
            {/* 사용자 편집본은 AI가 덮지 않으므로(서버가 차단) '다시 생성하기'를 숨긴다 — 무음 no-op 방지. */}
            {!note.isUserEdited && (
              <Button variant="ghost" size="sm" onClick={generate} loading={status === "generating"}>
                다시 생성하기
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={startEdit} disabled={status === "generating"}>
              편집하기
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {status === "error" && <div className={s.aiMuted}>{errorMessage(error)}</div>}
          {status !== "error" && <div className={s.aiMuted}>아직 AI 설명이 없어요. 구조와 연결을 근거로 만들어 드릴게요.</div>}
          <div className={s.aiActions}>
            <Button variant="ghost" size="sm" onClick={generate} loading={status === "generating"}>
              설명 생성하기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

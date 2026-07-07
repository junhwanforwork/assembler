"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { InsightCard } from "@/components/ui/InsightCard"
import { useDbTableNote } from "@/hooks/useDbTableNote"
import { invalidateCachedNote } from "@/lib/db-learning/note-cache"
import { errorMessage } from "@/lib/api/messages"
import s from "./editor.module.css"

// DB Learning — 인스펙터 안 'AI 설명' 섹션.
// 사실(컬럼·관계, 위쪽 섹션)과 분리된 추론 레이어 → 노트 내용은 InsightCard(제목+배지+요약+좋은 점/주의할 점)가 그린다.
// 상태 분기(loading/edit/empty)와 재생성·편집 버튼은 여기(소비처) 몫.
export function DbTableNoteCard({ workspaceId, tableId }: { workspaceId: string; tableId: string }) {
  const { note, status, error, generate, save } = useDbTableNote(workspaceId, tableId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  // 노트가 바뀌면(재생성·편집) 문서 뷰의 워크스페이스 캐시를 무효화한다 — 데이터 사전이 옛 해석을 물고 있지 않게(ASM-056 ⑦).
  const regenerate = async () => {
    const ok = await generate()
    if (ok) invalidateCachedNote(workspaceId, tableId)
  }

  const startEdit = () => {
    setDraft(note?.explanation ?? "")
    setEditing(true)
  }
  const submitEdit = async () => {
    const trimmed = draft.trim()
    if (trimmed.length === 0) return
    // 저장 성공 시에만 닫는다 — 실패면 에디터를 유지해 입력(draft)을 잃지 않고 에러를 보여준다.
    const ok = await save(trimmed)
    if (ok) {
      invalidateCachedNote(workspaceId, tableId)
      setEditing(false)
    }
  }

  // InsightCard가 자체 헤더를 그리므로, 노트 없는 분기에서만 이 헤더를 쓴다.
  const head = (
    <div className={s.aiHead}>
      <span className={s.inspH}>AI 설명</span>
      <Badge variant="status" tone="brand">AI 추정</Badge>
    </div>
  )

  return (
    <div className={s.inspSec}>
      {status === "loading" ? (
        <div>
          {head}
          <div className={s.aiMuted}>불러오는 중이에요…</div>
        </div>
      ) : editing ? (
        <div>
          {head}
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
        </div>
      ) : note ? (
        <div>
          <InsightCard
            title="AI 설명"
            summary={note.explanation}
            pros={note.pros}
            cons={note.cons}
            conservative={!note.grounded}
            userEdited={note.isUserEdited}
          />
          {status === "error" && <div className={s.aiMuted}>{errorMessage(error)}</div>}
          <div className={s.aiActions}>
            {/* 사용자 편집본은 AI가 덮지 않으므로(서버가 차단) '다시 생성하기'를 숨긴다 — 무음 no-op 방지. */}
            {!note.isUserEdited && (
              <Button variant="ghost" size="sm" onClick={regenerate} loading={status === "generating"}>
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
          {head}
          {status === "error" && <div className={s.aiMuted}>{errorMessage(error)}</div>}
          {status !== "error" && <div className={s.aiMuted}>아직 AI 설명이 없어요. 구조와 연결을 근거로 만들어 드릴게요.</div>}
          <div className={s.aiActions}>
            <Button variant="ghost" size="sm" onClick={regenerate} loading={status === "generating"}>
              설명 생성하기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

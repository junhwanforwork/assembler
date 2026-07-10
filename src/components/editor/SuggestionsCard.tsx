"use client"

import { useCallback } from "react"
import type { Suggestion, SuggestionKind, WorkspaceDesign } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge, type BadgeTone } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useSpecJump } from "./useSpecJump"
import { resolveSuggestionJump, suggestionTargetName } from "./suggestionsTarget"
import { CloseIcon } from "./icons"
import s from "./SuggestionsCard.module.css"

// AI 제안 패널(ASM-023 → ASM-081) — 아이템(요구사항·기능) 3dot 메뉴(SpecItemMenu)의 내용으로 산다.
// 온디맨드 유료 AI 호출이라 자동 패치 없이 명시적 버튼으로만 분석한다(rate limit 방어와 결).
// 상태는 store(useEditorStore) 소유 — Popover는 열릴 때만 content를 마운트해 로컬 state면 닫을 때마다
// 유료 결과가 유실된다. store 캐시로 "닫아도 결과 유지"를 보장(RightPanel.tsx:57-58 유실 주석 근거).
// dismiss 는 워크스페이스 스코프 캐시 — 저장하지 않고 다시 분석하면 초기화된다.

const KIND_LABEL: Record<SuggestionKind, string> = {
  missing_api: "API 누락",
  missing_db: "DB 누락",
  orphan_object: "고립 객체",
  missing_acceptance: "수용 기준 없음",
  gap: "공백",
  improvement: "개선 제안",
}

const KIND_TONE: Record<SuggestionKind, BadgeTone> = {
  missing_api: "warning",
  missing_db: "warning",
  orphan_object: "negative",
  missing_acceptance: "warning",
  gap: "negative",
  improvement: "brand",
}

// 유료 제안 생성(명시 트리거 전용) — 컴포넌트에서 버튼 클릭으로만 호출한다(자동 발사 없음, ASM-048).
// in-flight 가드는 store의 최신 status(getState)로 본다 — 유료 중복 발사·응답 역순 덮어쓰기 차단.
export function useGenerateSuggestions(workspaceId: string): () => Promise<void> {
  const startSuggestions = useEditorStore((st) => st.startSuggestions)
  const setSuggestionsResult = useEditorStore((st) => st.setSuggestionsResult)
  const failSuggestions = useEditorStore((st) => st.failSuggestions)

  return useCallback(async () => {
    if (useEditorStore.getState().suggestionsStatus === "loading") return
    startSuggestions()
    try {
      const data = await api.post<{ suggestions: Suggestion[] }>(`/api/workspaces/${workspaceId}/suggestions`, {})
      setSuggestionsResult(data.suggestions)
    } catch (err) {
      failSuggestions(err)
    }
  }, [workspaceId, startSuggestions, setSuggestionsResult, failSuggestions])
}

export function SuggestionsCard({ workspaceId, design }: { workspaceId: string; design: WorkspaceDesign }) {
  const status = useEditorStore((st) => st.suggestionsStatus)
  const suggestions = useEditorStore((st) => st.suggestions)
  const dismissedIds = useEditorStore((st) => st.suggestionsDismissedIds)
  const error = useEditorStore((st) => st.suggestionsError)
  const dismiss = useEditorStore((st) => st.dismissSuggestion)
  const generate = useGenerateSuggestions(workspaceId)

  const visible = suggestions.filter((sug) => !dismissedIds.includes(sug.id))

  return (
    <section className={s.card} aria-label="AI 제안">
      <div className={s.head}>
        <span className={s.title}>AI 제안</span>
        <Badge variant="status" tone="brand">AI 추정</Badge>
      </div>

      {status === "idle" && (
        <div>
          <div className={s.muted}>구조를 분석해서 빠진 연결과 개선점을 찾아드릴게요.</div>
          <div className={s.actions}>
            <Button variant="ghost" size="sm" onClick={generate}>
              분석하기
            </Button>
          </div>
        </div>
      )}

      {/* role=status — 분석 시작·실패 전환을 스크린리더에도 알린다. */}
      {status === "loading" && (
        <div className={s.muted} role="status">
          구조를 분석하고 있어요…
        </div>
      )}

      {status === "error" && (
        <div>
          <div className={s.muted} role="status">
            {errorMessage(error)}
          </div>
          <div className={s.actions}>
            <Button variant="ghost" size="sm" onClick={generate}>
              다시 시도하기
            </Button>
          </div>
        </div>
      )}

      {status === "loaded" && (
        <div>
          {suggestions.length === 0 ? (
            <div className={s.muted}>빈틈을 찾지 못했어요. 지금 구조가 잘 연결돼 있어요.</div>
          ) : visible.length === 0 ? (
            <div className={s.muted}>제안을 모두 확인했어요.</div>
          ) : (
            <ul className={s.list}>
              {visible.map((sug) => (
                <SuggestionItem key={sug.id} suggestion={sug} design={design} onDismiss={() => dismiss(sug.id)} />
              ))}
            </ul>
          )}
          <div className={s.actions}>
            <Button variant="ghost" size="sm" onClick={generate}>
              다시 분석하기
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function SuggestionItem({
  suggestion,
  design,
  onDismiss,
}: {
  suggestion: Suggestion
  design: WorkspaceDesign
  onDismiss: () => void
}) {
  // #39 점프 가드 — ImpactSection·FeaturePanel과 같은 규칙(useSpecJump 단일 출처).
  const jump = useSpecJump(design)

  const jumpTarget = resolveSuggestionJump(design, suggestion.targetType, suggestion.targetId)
  const targetName = suggestionTargetName(design, suggestion.targetType, suggestion.targetId)

  return (
    <li className={s.item}>
      <div className={s.itemHead}>
        <Badge variant="status" tone={KIND_TONE[suggestion.kind]}>{KIND_LABEL[suggestion.kind]}</Badge>
        <button type="button" className={s.dismiss} aria-label="제안 닫기" onClick={onDismiss}>
          <CloseIcon size={12} />
        </button>
      </div>
      <div className={s.itemTitle}>{suggestion.title}</div>
      <div className={s.itemDetail}>{suggestion.detail}</div>
      {targetName &&
        (jumpTarget ? (
          <button type="button" className={s.target} onClick={() => jump(jumpTarget)}>
            {targetName}
          </button>
        ) : (
          // 대응 선택이 없는 타입(page·flow·element)·경로 없는 기능 — 이름만 보여준다.
          <span className={s.targetStatic}>{targetName}</span>
        ))}
    </li>
  )
}

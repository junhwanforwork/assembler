"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import type { Suggestion, WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangePlan } from "@/lib/types/chat"
import { api } from "@/lib/api/client"
import { hasWaitingPlan, useEditorStore } from "@/lib/stores/useEditorStore"
import { useEditorChat } from "@/hooks/useEditorChat"
import { Badge } from "@/components/ui/Badge"
import { Button, IconButton } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { ChatIcon, ChevronDown, SendIcon } from "../icons"
import { ChatMessages } from "./ChatMessages"
import { ChangePlanCard } from "./ChangePlanCard"
import s from "../editor.module.css"

// 하단 AI 챗 도크(ASM-018, #15·16·19) — 접이식. 변경 계획이 생기면 자동으로 열린다(claude.ai 패턴).
// DoD: 챗 입력 → 계획 자동 → 적용하기, 3 인터랙션 안에 그래프 반영.

type SuggestionsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; suggestions: Suggestion[] }

export function ChatDock({
  workspaceId,
  design,
  onDesignChange,
}: {
  workspaceId: string
  design: WorkspaceDesign
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const dockOpen = useEditorStore((st) => st.dockOpen)
  const openDock = useEditorStore((st) => st.openDock)
  const closeDock = useEditorStore((st) => st.closeDock)

  // 변경 계획은 store 소유(ASM-046) — 도크 언마운트·재렌더에도 계획이 조용히 사라지지 않는다.
  const activePlan = useEditorStore((st) => st.activePlan)
  const pendingPlan = useEditorStore((st) => st.pendingPlan)
  const receivePlan = useEditorStore((st) => st.receivePlan)
  const confirmReplacePlan = useEditorStore((st) => st.confirmReplacePlan)
  const dismissPendingPlan = useEditorStore((st) => st.dismissPendingPlan)
  const clearActivePlan = useEditorStore((st) => st.clearActivePlan)

  const [input, setInput] = useState("")
  const [sugState, setSugState] = useState<SuggestionsState>({ kind: "idle" })
  const sugRequested = useRef(false)

  // 추천 칩(#19) = suggestions API 결과 렌더(하드코딩 금지). 유료 AI 호출이라 도크 확장 시 1회만.
  const ensureSuggestions = useCallback(() => {
    if (sugRequested.current) return
    sugRequested.current = true
    setSugState({ kind: "loading" })
    api
      .post<{ suggestions: Suggestion[] }>(`/api/workspaces/${workspaceId}/suggestions`, {})
      .then((res) => setSugState({ kind: "ready", suggestions: res.suggestions }))
      .catch(() => setSugState({ kind: "error" }))
  }, [workspaceId])

  const retrySuggestions = () => {
    sugRequested.current = false
    ensureSuggestions()
  }

  const expand = useCallback(() => {
    openDock()
    ensureSuggestions()
  }, [openDock, ensureSuggestions])

  // 변경 계획이 생기는 순간 도크 자동 오픈 — 검토 중 계획이 있으면 대기로 돌아가 확인을 요구한다(무언 대체 금지).
  const onPlan = useCallback(
    (plan: ChangePlan) => {
      receivePlan(workspaceId, plan)
      expand()
    },
    [receivePlan, workspaceId, expand],
  )

  const chat = useEditorChat(workspaceId, onPlan)

  // 미적용 계획 보유 중 페이지 이탈(새로고침·탭 닫기)만 확인 — 라우팅 전환은 store 생존이 막는다.
  const planWaiting = hasWaitingPlan({ activePlan, pendingPlan })
  useEffect(() => {
    if (!planWaiting) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [planWaiting])

  const submit = () => {
    const text = input.trim()
    // 전송 중 Enter는 무시하되 입력은 보존 — 무음 유실 금지(#16).
    if (!text || chat.sendState === "sending") return
    expand()
    chat.send(text)
    setInput("")
  }

  const sendFromChip = (text: string) => {
    expand()
    chat.send(text)
  }

  return (
    <div className={clsx(s.dock, dockOpen && s.dockExpanded)}>
      {dockOpen && (
        <div className={s.dockBody}>
          <ChatMessages
            messages={chat.messages}
            sendState={chat.sendState}
            errorText={chat.errorText}
            activePlan={activePlan}
            onPickOption={sendFromChip}
            onRetry={chat.retry}
          />
          {/* 대체 확인(ASM-046) — 명시적 "버리기"와 같은 확인 1단계를 새 계획 도착 경로에도 적용. */}
          {pendingPlan && (
            <div className={s.planReplaceBar}>
              <span className={s.planConfirmText}>새 계획이 도착했어요. 검토 중인 계획을 버리고 바꿀까요?</span>
              <Button variant="ghost" size="sm" onClick={dismissPendingPlan}>
                닫기
              </Button>
              <Button variant="filled" size="sm" onClick={confirmReplacePlan}>
                바꾸기
              </Button>
            </div>
          )}
          {activePlan && (
            <ChangePlanCard
              plan={activePlan}
              design={design}
              workspaceId={workspaceId}
              onDesignChange={onDesignChange}
              onDone={(notice) => {
                clearActivePlan()
                chat.addNote(notice)
              }}
              onDiscarded={clearActivePlan}
            />
          )}
          {!activePlan && (
            <div className={s.dockChips}>
              {sugState.kind === "loading" && <span className={s.dockChipsNote}>추천을 불러오고 있어요…</span>}
              {sugState.kind === "error" && (
                <span className={s.dockChipsNote}>
                  추천을 불러오지 못했어요.
                  <Button variant="ghost" size="sm" onClick={retrySuggestions}>
                    다시 시도하기
                  </Button>
                </span>
              )}
              {sugState.kind === "ready" && sugState.suggestions.length === 0 && (
                <span className={s.dockChipsNote}>지금은 추천할 게 없어요. 스펙이 잘 연결돼 있어요.</span>
              )}
              {sugState.kind === "ready" &&
                sugState.suggestions.map((sug) => (
                  <Chip key={sug.id} marker="AI" onClick={() => sendFromChip(`${sug.title} — ${sug.detail}`)}>
                    {sug.title}
                  </Chip>
                ))}
            </div>
          )}
        </div>
      )}

      <div className={s.dockBar}>
        <ChatIcon />
        {/* 접힘 무신호 해소(ASM-046) — 접힌 바에도 검토 대기 계획의 존재를 알린다. */}
        {!dockOpen && planWaiting && (
          <Badge variant="pill" tone="brand">
            계획 대기
          </Badge>
        )}
        <input
          className={s.dockInput}
          value={input}
          placeholder="스펙에 대해 물어보거나 바꿔 달라고 해보세요"
          aria-label="AI 챗 입력"
          onFocus={expand}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit()
          }}
        />
        <IconButton label="보내기" onClick={submit} disabled={!input.trim() || chat.sendState === "sending"}>
          <SendIcon />
        </IconButton>
        <IconButton
          label={dockOpen ? "챗 접기" : "챗 펼치기"}
          aria-expanded={dockOpen}
          onClick={dockOpen ? closeDock : expand}
          className={clsx(s.dockToggle, dockOpen && s.dockToggleOpen)}
        >
          <ChevronDown />
        </IconButton>
      </div>
    </div>
  )
}

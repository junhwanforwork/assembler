"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import type { Suggestion, WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangePlan } from "@/lib/types/chat"
import { api } from "@/lib/api/client"
import { hasWaitingPlanFor, useEditorStore } from "@/lib/stores/useEditorStore"
import { useEditorChat } from "@/hooks/useEditorChat"
import { Button, IconButton } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { ChatIcon, ChevronDown, SendIcon } from "./icons"
import { ChatMessages } from "./dock/ChatMessages"
import { ChangePlanCard } from "./dock/ChangePlanCard"
import s from "./editor.module.css"
import p from "./PromptDock.module.css"

// 프롬프트 좌측 도킹 패널(ASM-076) — 하단 챗 도크(ChatDock)의 챗 코어를 그대로 재사용하고
// 셸만 왼쪽 세로 패널로 교체한다. 항상 열림(접이식 토글 불필요, 반응형 접힘만 로컬 토글로 허용).
// 우측 리사이즈 그립(useResizable)은 EditorClient가 소유해 그리드 폭 변수를 구동하고 handleProps만 내려준다.

type ResizeHandleProps = {
  onPointerDown: (e: ReactPointerEvent) => void
  role: "separator"
  "aria-orientation": "vertical"
  "aria-valuenow": number
  "aria-valuemin": number
  "aria-valuemax": number
  tabIndex: number
}

type SuggestionsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; suggestions: Suggestion[] }

export function PromptDock({
  workspaceId,
  design,
  onDesignChange,
  resizeHandleProps,
  onCollapse,
}: {
  workspaceId: string
  design: WorkspaceDesign
  onDesignChange: (design: WorkspaceDesign) => void
  resizeHandleProps: ResizeHandleProps
  onCollapse: () => void
}) {
  // 변경 계획은 store 소유(ASM-046) — 패널 재렌더에도 계획이 조용히 사라지지 않는다.
  const activePlan = useEditorStore((st) => st.activePlan)
  const activePlanWorkspaceId = useEditorStore((st) => st.activePlanWorkspaceId)
  const pendingPlan = useEditorStore((st) => st.pendingPlan)
  const planSeq = useEditorStore((st) => st.planSeq)
  const receivePlan = useEditorStore((st) => st.receivePlan)
  const confirmReplacePlan = useEditorStore((st) => st.confirmReplacePlan)
  const dismissPendingPlan = useEditorStore((st) => st.dismissPendingPlan)
  const clearActivePlan = useEditorStore((st) => st.clearActivePlan)

  // 소유 필터(QA 정정 3) — 늦은 챗 응답이 남긴 다른 워크스페이스 계획은 이 화면에 비추지 않는다.
  const planOwned = activePlanWorkspaceId === workspaceId

  const [input, setInput] = useState("")
  const [sugState, setSugState] = useState<SuggestionsState>({ kind: "idle" })
  const sugRequested = useRef(false)

  // 추천 칩(#19) = suggestions API 결과 렌더(하드코딩 금지). 유료 AI 호출이라 명시 트리거만(ASM-048) —
  // 항상 열린 패널에는 도크 토글이 없으므로 "추천 보기" 버튼·재시도 버튼이 유일한 발화 트리거다.
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

  // 변경 계획 도착 — 계획 보존만 한다. 패널은 이미 항상 열려 있어 도크 오픈 부수효과는 불필요(무해 생략).
  const onPlan = useCallback(
    (plan: ChangePlan) => {
      receivePlan(workspaceId, plan)
    },
    [receivePlan, workspaceId],
  )

  const chat = useEditorChat(workspaceId, onPlan)

  // 미적용 계획 보유 중 페이지 이탈(새로고침·탭 닫기)만 확인 — 라우팅 전환은 store 생존이 막는다.
  const planWaiting = hasWaitingPlanFor({ activePlan, pendingPlan, activePlanWorkspaceId }, workspaceId)
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
    chat.send(text)
    setInput("")
  }

  const sendFromChip = (text: string) => {
    chat.send(text)
  }

  return (
    <aside className={p.panel} aria-label="AI 프롬프트">
      <div className={p.head}>
        <ChatIcon />
        <span className={p.headTitle}>AI 프롬프트</span>
        <IconButton
          label="프롬프트 패널 접기"
          className={p.collapseBtn}
          onClick={onCollapse}
        >
          <ChevronDown />
        </IconButton>
      </div>

      <div className={p.body}>
        <ChatMessages
          messages={chat.messages}
          sendState={chat.sendState}
          errorText={chat.errorText}
          activePlan={activePlan}
          onPickOption={sendFromChip}
          onRetry={chat.retry}
        />
        {/* 대체 확인(ASM-046) — 명시적 "버리기"와 같은 확인 1단계를 새 계획 도착 경로에도 적용. */}
        {pendingPlan && planOwned && (
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
        {activePlan && planOwned && (
          <ChangePlanCard
            // key=planSeq(QA 정정 1) — 교체·승격 시 카드를 리마운트해 확인·에러 로컬 상태 누수를 끊는다.
            key={planSeq}
            plan={activePlan}
            design={design}
            workspaceId={workspaceId}
            onDesignChange={onDesignChange}
            onDone={(notice) => {
              clearActivePlan(planSeq)
              chat.addNote(notice)
            }}
            onDiscarded={() => clearActivePlan(planSeq)}
          />
        )}
        {!(activePlan && planOwned) && (
          <div className={s.dockChips}>
            {sugState.kind === "idle" && (
              <Button variant="ghost" size="sm" onClick={ensureSuggestions}>
                추천 보기
              </Button>
            )}
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

      <div className={p.footer}>
        <input
          className={s.dockInput}
          value={input}
          placeholder="스펙에 대해 물어보거나 바꿔 달라고 해보세요"
          aria-label="AI 챗 입력"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit()
          }}
        />
        <IconButton label="보내기" onClick={submit} disabled={!input.trim() || chat.sendState === "sending"}>
          <SendIcon />
        </IconButton>
      </div>

      {/* 우측 리사이즈 그립 — 폭 상태·커밋은 EditorClient의 useResizable가 소유(handleProps만 스프레드). */}
      <div className={p.grip} {...resizeHandleProps} aria-label="프롬프트 패널 폭 조절" />
    </aside>
  )
}

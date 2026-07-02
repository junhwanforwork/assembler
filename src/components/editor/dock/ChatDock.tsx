"use client"

import { useCallback, useRef, useState } from "react"
import { clsx } from "clsx"
import type { Suggestion, WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangePlan } from "@/lib/types/chat"
import { api } from "@/lib/api/client"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { useEditorChat } from "@/hooks/useEditorChat"
import { IconButton } from "@/components/ui/Button"
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

  const [activePlan, setActivePlan] = useState<ChangePlan | null>(null)
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

  // 변경 계획이 생기는 순간 도크 자동 오픈 — 최신 계획이 이전 계획을 대체한다.
  const onPlan = useCallback(
    (plan: ChangePlan) => {
      setActivePlan(plan)
      expand()
    },
    [expand],
  )

  const chat = useEditorChat(workspaceId, onPlan)

  const submit = () => {
    const text = input.trim()
    if (!text) return
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
            onPickOption={sendFromChip}
            onRetry={chat.retry}
          />
          {activePlan && (
            <ChangePlanCard
              plan={activePlan}
              design={design}
              workspaceId={workspaceId}
              onDesignChange={onDesignChange}
              onDone={(notice) => {
                setActivePlan(null)
                chat.addNote(notice)
              }}
              onDiscarded={() => setActivePlan(null)}
            />
          )}
          {!activePlan && (
            <div className={s.dockChips}>
              {sugState.kind === "loading" && <span className={s.dockChipsNote}>추천을 불러오고 있어요…</span>}
              {sugState.kind === "error" && (
                <span className={s.dockChipsNote}>
                  추천을 불러오지 못했어요.{" "}
                  <button className={s.dockChipsRetry} onClick={retrySuggestions}>
                    다시 시도하기
                  </button>
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
          onClick={dockOpen ? closeDock : expand}
          className={clsx(s.dockToggle, dockOpen && s.dockToggleOpen)}
        >
          <ChevronDown />
        </IconButton>
      </div>
    </div>
  )
}

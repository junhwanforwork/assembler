"use client"

import { useEffect, useRef } from "react"
import type { AssistantBlock } from "@/lib/types/chat"
import { Button } from "@/components/ui/Button"
import type { ChatMessage } from "./chatTurns"
import type { ChatSendState } from "@/hooks/useEditorChat"
import s from "../editor.module.css"

// 도크 대화 흐름 — text/clarify/plan 3종 블록(#16). clarify 옵션 클릭은 #16 전송 경로로 합류.
export function ChatMessages({
  messages,
  sendState,
  errorText,
  onPickOption,
  onRetry,
}: {
  messages: ChatMessage[]
  sendState: ChatSendState
  errorText: string
  onPickOption: (label: string) => void
  onRetry: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  // 새 메시지·상태 변화 때 맨 아래로 — 대화형 표면의 기본 기대.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, sendState])

  return (
    <div className={s.dockMsgs}>
      {messages.length === 0 && (
        <div className={s.dockEmpty}>
          스펙에 대해 물어보거나, 바꾸고 싶은 걸 말해 보세요.
          <br />
          변경은 계획으로 만들어 드리고, 적용은 직접 결정해요.
        </div>
      )}
      {messages.map((msg, i) =>
        msg.role === "user" ? (
          <div key={i} className={s.msgUser}>
            {msg.text}
          </div>
        ) : (
          <div key={i} className={s.msgAssistant}>
            {msg.blocks.map((block, j) => (
              <AssistantBlockView key={j} block={block} onPickOption={onPickOption} />
            ))}
          </div>
        ),
      )}
      {sendState === "sending" && <div className={s.msgPending}>생각하는 중이에요…</div>}
      {sendState === "error" && (
        <div className={s.msgError}>
          {errorText}
          <Button variant="ghost" size="sm" onClick={onRetry}>
            다시 시도하기
          </Button>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

function AssistantBlockView({
  block,
  onPickOption,
}: {
  block: AssistantBlock
  onPickOption: (label: string) => void
}) {
  if (block.kind === "text") return <p className={s.msgText}>{block.text}</p>
  if (block.kind === "clarify") {
    return (
      <div>
        <p className={s.msgText}>{block.question}</p>
        <div className={s.clarifyRow}>
          {block.options.map((option) => (
            <button key={option.id} className={s.clarifyChip} onClick={() => onPickOption(option.label)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  // plan 블록의 본체는 고정 카드(ChangePlanCard)가 담당 — 흐름에는 안내만 남긴다.
  return <p className={s.msgPlanNote}>변경 계획 「{block.plan.title}」을 만들었어요. 아래에서 확인해 주세요.</p>
}

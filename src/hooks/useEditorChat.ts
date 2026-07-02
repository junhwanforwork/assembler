"use client"

import { useCallback, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api/client"
import type { AssistantBlock, ChangePlan } from "@/lib/types/chat"
import { type ChatMessage, toChatTurns } from "@/components/editor/dock/chatTurns"

// 에디터 AI 챗(ASM-018) 클라이언트 상태 — 대화는 세션 동안만 산다(서버 영속 없음).
// 변경성 응답(plan)은 그래프에 직행하지 않는다 — onPlan으로 도크 승인 경로에 넘긴다(#16).

export type ChatSendState = "idle" | "sending" | "error"

// 영구적 실패(재시도가 답이 아닌 것)는 상황에 맞는 안내로 — 재시도 카피를 오답으로 주지 않는다.
function errorCopy(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "rate_limited") return "요청이 잠깐 몰렸어요. 잠시 후 다시 시도해 주세요."
    if (err.code === "network_error") return "네트워크 연결을 확인하고 다시 시도해 주세요."
    if (err.code === "design_too_large_for_chat")
      return "스펙이 너무 커서 챗으로 다룰 수 없어요. 스펙을 나눠서 관리해 주세요."
    if (err.code === "ai_unavailable") return "지금 AI 연결이 준비되지 않았어요. 관리자에게 문의해 주세요."
  }
  return "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."
}

export function useEditorChat(workspaceId: string, onPlan: (plan: ChangePlan) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sendState, setSendState] = useState<ChatSendState>("idle")
  const [errorText, setErrorText] = useState("")
  // 실패한 입력 — 재시도(#16)가 사용자 메시지를 중복 추가하지 않고 같은 턴을 다시 보낸다.
  // index를 함께 보관 — addNote 등으로 "마지막 = 실패 턴" 가정이 깨져도 정확히 그 턴만 뺀다.
  const [failed, setFailed] = useState<{ text: string; index: number } | null>(null)
  const seqRef = useRef(0)

  const post = useCallback(
    async (history: ChatMessage[], text: string) => {
      const seq = ++seqRef.current
      setSendState("sending")
      setErrorText("")
      try {
        const res = await api.post<{ blocks: AssistantBlock[] }>(`/api/workspaces/${workspaceId}/chat`, {
          messages: toChatTurns(history, text),
        })
        if (seq !== seqRef.current) return
        setMessages((prev) => [...prev, { role: "assistant", blocks: res.blocks }])
        setSendState("idle")
        setFailed(null)
        const planBlock = res.blocks.find((b) => b.kind === "plan")
        if (planBlock && planBlock.kind === "plan") onPlan(planBlock.plan)
      } catch (err) {
        if (seq !== seqRef.current) return
        setSendState("error")
        setErrorText(errorCopy(err))
        // 실패한 user 턴의 위치 = 전달받은 history 바로 뒤.
        setFailed({ text, index: history.length })
      }
    },
    [workspaceId, onPlan],
  )

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sendState === "sending") return
      // 새 입력이 나가면 이전 실패 턴은 그냥 히스토리의 일부 — 재시도 대상에서 내린다.
      setFailed(null)
      const history = messages
      setMessages((prev) => [...prev, { role: "user", text: trimmed }])
      void post(history, trimmed)
    },
    [messages, post, sendState],
  )

  // 실패 턴 재전송 — 사용자 메시지는 이미 목록에 있으므로 히스토리에서 그 턴만 뺀다.
  const retry = useCallback(() => {
    if (failed === null || sendState === "sending") return
    void post(messages.filter((_, i) => i !== failed.index), failed.text)
  }, [failed, messages, post, sendState])

  // 적용 완료 같은 시스템 알림을 대화 흐름에 남긴다(별도 토스트 없이 한 무대).
  const addNote = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "assistant", blocks: [{ kind: "text", text }] }])
  }, [])

  return { messages, sendState, errorText, send, retry, addNote }
}

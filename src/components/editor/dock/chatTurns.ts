import type { ChatTurn, AssistantBlock } from "@/lib/types/chat"
import { MAX_CHAT_TURNS, MAX_CHAT_TEXT_LENGTH } from "@/lib/api/validate"

// 챗 도크의 대화 상태 — 클라이언트가 세션 동안 들고 있는 단일 출처(서버 영속 없음).
export type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; blocks: AssistantBlock[] }

// assistant 턴을 히스토리 텍스트로 — 모델이 직전 계획·질문 맥락을 이어가도록 요약 직렬화.
function blockText(block: AssistantBlock): string {
  if (block.kind === "text") return block.text
  if (block.kind === "clarify") {
    return `${block.question} (${block.options.map((o) => o.label).join(" / ")})`
  }
  const ops = block.plan.ops.map((op) => `- ${op.summary}`).join("\n")
  return `[변경 계획] ${block.plan.title} — ${block.plan.summary}${ops ? `\n${ops}` : ""}`
}

// 히스토리 + 이번 입력 → API messages. 서버 계약(parseChatTurns)에 맞춘다:
// 최대 20턴·턴당 4000자·첫 턴 user·마지막 턴 user. 초과분은 오래된 턴부터 버린다.
export function toChatTurns(history: ChatMessage[], newText: string): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const msg of history) {
    const text = (msg.role === "user" ? msg.text : msg.blocks.map(blockText).join("\n\n")).trim()
    if (!text) continue // 빈 턴은 서버가 거부한다.
    turns.push({ role: msg.role, text: text.slice(0, MAX_CHAT_TEXT_LENGTH) })
  }
  turns.push({ role: "user", text: newText.trim().slice(0, MAX_CHAT_TEXT_LENGTH) })

  let recent = turns.slice(-MAX_CHAT_TURNS)
  // 잘린 결과가 assistant로 시작하면 첫 user까지 더 버린다(Anthropic 계약).
  while (recent.length > 0 && recent[0].role === "assistant") recent = recent.slice(1)
  return recent
}

import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { CHAT_SCHEMA, CHAT_SYSTEM, buildChatUserMessage } from "@/lib/prompts/assembler-chat"
import { jsonByteLength } from "@/lib/api/validate"
import { parseChatOutput } from "./parse"
import type { AssistantBlock, ChatTurn } from "@/lib/types/chat"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// 대화 응답이라 생성보다 가볍다 — sonnet + structured outputs. plan payload(항목 JSON) 때문에 suggestions보다 상한 여유.
const CHAT_MAX_TOKENS = 4000
const CHAT_TIMEOUT_MS = 60000

// 그래프 전체가 프롬프트에 실린다 — 저장 캡(1MB)까지 큰 그래프는 컨텍스트/비용 폭주라 챗에서 컷.
export const MAX_CHAT_DESIGN_BYTES = 200_000

export type ChatResult =
  | { ok: true; blocks: AssistantBlock[]; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 디자인 그래프 + 코드-진실 + 대화 히스토리 → 검증·살균된 블록. 에러 분류는 suggestions(run.ts)와 동일.
export async function runChat(design: WorkspaceDesign, apis: Api[], dbTables: DbTable[], turns: ChatTurn[]): Promise<ChatResult> {
  if (jsonByteLength(design) > MAX_CHAT_DESIGN_BYTES) return { ok: false, error: "design_too_large", status: 413 }

  // 히스토리는 그대로, 가변 컨텍스트(그래프·코드-진실)는 마지막 user 턴에만 — 질문 바로 옆이 가장 정확하다.
  const last = turns[turns.length - 1]
  const messages = [
    ...turns.slice(0, -1).map((t) => ({ role: t.role, content: t.text })),
    { role: "user" as const, content: buildChatUserMessage(design, apis, dbTables, last.text) },
  ]

  let text: string
  let usage: AnthropicUsage | undefined
  try {
    const result = await callAnthropicWithRetry({
      system: CHAT_SYSTEM,
      messages,
      model: "sonnet",
      maxTokens: CHAT_MAX_TOKENS,
      outputSchema: CHAT_SCHEMA,
      cacheSystem: true,
      timeoutMs: CHAT_TIMEOUT_MS,
    })
    text = result.text
    usage = result.usage
  } catch (error) {
    if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
    if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
    if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
    return { ok: false, error: "server_error", status: 500 }
  }

  const parsed = parseChatOutput(text, design)
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 422 }

  return { ok: true, blocks: parsed.value, usage }
}

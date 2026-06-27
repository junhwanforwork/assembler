import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { SUGGESTIONS_SCHEMA, SUGGESTIONS_SYSTEM, buildSuggestionsUserMessage } from "@/lib/prompts/assembler-suggestions"
import { parseSuggestions } from "./parse"
import type { Api, DbTable, Suggestion, WorkspaceDesign } from "@/lib/types/assembler"

// 분석 작업이라 생성보다 가벼움 — sonnet + 작은 상한. structured outputs 로 JSON 강제(thinking 불필요).
const SUGGESTIONS_MAX_TOKENS = 2000
const SUGGESTIONS_TIMEOUT_MS = 60000

export type SuggestionsResult =
  | { ok: true; suggestions: Suggestion[]; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 분석할 객체가 하나도 없으면 제안도 없다 — 유료 호출 낭비 차단.
function isEmptyDesign(d: WorkspaceDesign): boolean {
  return (
    d.requirements.length === 0 &&
    d.features.length === 0 &&
    d.pages.length === 0 &&
    d.flows.length === 0 &&
    d.elements.length === 0
  )
}

// 디자인 그래프 + 코드-진실 → 검증·살균된 제안. 에러 분류는 generate(run.ts)와 동일.
export async function runSuggestions(design: WorkspaceDesign, apis: Api[], dbTables: DbTable[]): Promise<SuggestionsResult> {
  if (isEmptyDesign(design)) return { ok: true, suggestions: [] }

  let text: string
  let usage: AnthropicUsage | undefined
  try {
    const result = await callAnthropicWithRetry({
      system: SUGGESTIONS_SYSTEM,
      messages: [{ role: "user", content: buildSuggestionsUserMessage(design, apis, dbTables) }],
      model: "sonnet",
      maxTokens: SUGGESTIONS_MAX_TOKENS,
      outputSchema: SUGGESTIONS_SCHEMA,
      cacheSystem: true,
      timeoutMs: SUGGESTIONS_TIMEOUT_MS,
    })
    text = result.text
    usage = result.usage
  } catch (error) {
    if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
    if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
    if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
    return { ok: false, error: "server_error", status: 500 }
  }

  const parsed = parseSuggestions(text, design)
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 422 }

  return { ok: true, suggestions: parsed.value, usage }
}

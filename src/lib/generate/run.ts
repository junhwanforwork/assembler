import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { GENERATE_SYSTEM, buildGenerateUserMessage } from "@/lib/prompts/assembler-generate"
import { parseGeneratedDesign } from "./parse-design"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// opus + thinking 은 출력이 크고 느려 상한을 넉넉히.
const GENERATE_MAX_TOKENS = 16000
const GENERATE_TIMEOUT_MS = 120000

export type GenerateResult =
  | { ok: true; design: WorkspaceDesign; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 아이디어 + 코드-진실 → 검증된 디자인 그래프. /api/generate 와 파일 생성 라우트가 공유한다.
// Anthropic 에러는 상태코드까지 분류해 돌려준다(라우트는 그대로 응답).
export async function runGenerate(idea: string, apis: Api[], dbTables: DbTable[]): Promise<GenerateResult> {
  const codeTruth = { apiIds: new Set(apis.map((a) => a.id)), dbTableIds: new Set(dbTables.map((t) => t.id)) }

  let text: string
  let usage: AnthropicUsage | undefined
  try {
    const result = await callAnthropicWithRetry({
      system: GENERATE_SYSTEM,
      messages: [{ role: "user", content: buildGenerateUserMessage(idea, apis, dbTables) }],
      model: "opus",
      maxTokens: GENERATE_MAX_TOKENS,
      cacheSystem: true,
      thinking: "adaptive",
      timeoutMs: GENERATE_TIMEOUT_MS,
    })
    text = result.text
    usage = result.usage
  } catch (error) {
    if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
    if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
    if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
    return { ok: false, error: "server_error", status: 500 }
  }

  const parsed = parseGeneratedDesign(text, codeTruth)
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 422 }

  return { ok: true, design: parsed.value, usage }
}

import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { API_LEARNING_SCHEMA, API_LEARNING_SYSTEM, buildApiLearningUserMessage } from "@/lib/prompts/api-learning"
import type { Api } from "@/lib/types/assembler"
import type { ApiEvidence } from "./evidence"
import { parseApiNote, type ParsedApiNote } from "./parse"

// API 해석(ASM-064) 실행 — db-learning run 미러.
// 살균 화이트리스트 — 설명이 언급해도 되는 이름 = 이 API를 쓰는 기능 + 그 기능들이 닿는 테이블뿐.
// 실재하지만 이 API와 연결 안 된 기능·테이블을 끌어오는 관계 환각도 reject 한다.
function allowedNames(evidence: ApiEvidence): ReadonlySet<string> {
  return new Set<string>([...evidence.usedByFeatures, ...evidence.relatedTables])
}

// 호버·셀 설명이라 짧고 가볍다 — haiku + 작은 상한. structured outputs 로 JSON 강제.
const MAX_TOKENS = 400
const TIMEOUT_MS = 30000
const MAX_ATTEMPTS = 2

export type ApiLearningResult =
  | { ok: true; note: ParsedApiNote; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 환각 방어 폴백 — AI가 거듭 환각하거나 출력이 깨지면 method·endpoint 사실만 보수적으로(grounded=false).
// 사실만 나열하므로 절대 틀린 맥락을 학습시키지 않는다.
function conservativeFallback(api: Api): ParsedApiNote {
  return {
    explanation: `${api.method} ${api.endpoint} API예요. 연결 정보가 적어 자세한 역할은 추정하기 어려워요.`,
    grounded: false,
  }
}

// 증거 → 검증·살균된 설명. 살균 실패(환각 이름 언급 등)는 1회 재시도 후 보수 폴백으로 안전 강등.
// 인프라 오류(키 없음·refusal·API)는 폴백하지 않고 상태코드로 surface(라우트가 해요체 변환).
export async function runApiLearning(evidence: ApiEvidence): Promise<ApiLearningResult> {
  const allowed = allowedNames(evidence)
  const userMessage = buildApiLearningUserMessage(evidence)
  let lastUsage: AnthropicUsage | undefined

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let text: string
    try {
      const result = await callAnthropicWithRetry({
        system: API_LEARNING_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
        model: "haiku",
        maxTokens: MAX_TOKENS,
        outputSchema: API_LEARNING_SCHEMA,
        cacheSystem: true,
        timeoutMs: TIMEOUT_MS,
      })
      text = result.text
      lastUsage = result.usage
    } catch (error) {
      if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
      if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
      if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
      return { ok: false, error: "server_error", status: 500 }
    }

    const parsed = parseApiNote(text, allowed)
    if (parsed.ok) {
      // 고립 클램프 — 연결 근거가 없으니 AI가 줘도 grounded=false로 강등하고 pros/cons도 드롭한다.
      // ("보수적으로 추정했어요" 안내와 "좋은 점" 불릿이 공존하면 정직 원칙이 깨진다.)
      const grounded = parsed.value.grounded && !evidence.isIsolated
      const note = evidence.isIsolated ? { explanation: parsed.value.explanation, grounded } : { ...parsed.value, grounded }
      return { ok: true, note, usage: lastUsage }
    }
    // 파싱·살균 실패 → 한 번 더 시도. 두 번째도 실패면 아래 보수 폴백.
  }

  return { ok: true, note: conservativeFallback(evidence.api), usage: lastUsage }
}

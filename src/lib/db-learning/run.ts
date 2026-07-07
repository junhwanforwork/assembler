import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { DB_LEARNING_SCHEMA, DB_LEARNING_SYSTEM, buildDbLearningUserMessage } from "@/lib/prompts/db-learning"
import type { DbTable } from "@/lib/types/assembler"
import type { TableEvidence } from "./evidence"
import { parseDbNote, type ParsedNote } from "./parse"

// 살균 화이트리스트 — 설명이 언급해도 되는 테이블 = 자기 자신 + 직접 연결된 증거 테이블뿐.
// 전체 테이블이 아니라 "연결된 증거"로 좁혀, 실재하지만 이 테이블과 연결 안 된 테이블을 끌어오는
// 관계 환각("이 테이블은 customers와 연결돼요" — 실제론 FK 없음)도 reject 한다.
function allowedTableNames(evidence: TableEvidence): ReadonlySet<string> {
  const names = new Set<string>([evidence.table.name])
  for (const f of evidence.fkOut) names.add(f.refTable)
  for (const f of evidence.fkIn) names.add(f.fromTable)
  return names
}

// 호버 설명이라 짧고 가볍다 — haiku + 작은 상한. structured outputs 로 JSON 강제.
const MAX_TOKENS = 400
const TIMEOUT_MS = 30000
const MAX_ATTEMPTS = 2

export type DbLearningResult =
  | { ok: true; note: ParsedNote; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 환각 방어 폴백 — AI가 거듭 환각하거나 출력이 깨지면 컬럼 사실만 보수적으로(grounded=false).
// 사실(컬럼명)만 나열하므로 절대 틀린 맥락을 학습시키지 않는다.
function conservativeFallback(table: DbTable): ParsedNote {
  const cols = table.columns
    .slice(0, 6)
    .map((c) => c.name)
    .join("·")
  const explanation = cols
    ? `${table.name} 테이블은 ${cols} 같은 컬럼을 담고 있어요. 연결 정보가 적어 자세한 역할은 추정하기 어려워요.`
    : `${table.name} 테이블의 자세한 역할은 아직 설명하기 어려워요.`
  return { explanation, grounded: false }
}

// 증거 → 검증·살균된 설명. 살균 실패(환각 테이블 언급 등)는 1회 재시도 후 보수 폴백으로 안전 강등.
// 인프라 오류(키 없음·refusal·API)는 폴백하지 않고 상태코드로 surface(라우트가 해요체 변환).
export async function runDbLearning(evidence: TableEvidence): Promise<DbLearningResult> {
  const allowed = allowedTableNames(evidence)
  const userMessage = buildDbLearningUserMessage(evidence)
  let lastUsage: AnthropicUsage | undefined

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let text: string
    try {
      const result = await callAnthropicWithRetry({
        system: DB_LEARNING_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
        model: "haiku",
        maxTokens: MAX_TOKENS,
        outputSchema: DB_LEARNING_SCHEMA,
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

    const parsed = parseDbNote(text, allowed)
    if (parsed.ok) {
      // grounded 클램프 — 고립이면 연결 근거가 없으니 AI가 true를 줘도 false로 강등.
      const grounded = parsed.value.grounded && !evidence.isIsolated
      return { ok: true, note: { ...parsed.value, grounded }, usage: lastUsage }
    }
    // 파싱·살균 실패 → 한 번 더 시도. 두 번째도 실패면 아래 보수 폴백.
  }

  return { ok: true, note: conservativeFallback(evidence.table), usage: lastUsage }
}

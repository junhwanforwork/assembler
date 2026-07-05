import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { streamAnthropicWithRetry } from "@/lib/anthropic-retry"
import { GENERATE_SYSTEM, buildGenerateUserMessage } from "@/lib/prompts/assembler-generate"
import { parseGeneratedDesign } from "./parse-design"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// opus + thinking 은 출력이 크고 느려 상한을 넉넉히.
// ASM-045: G-1 실측 12,663톤 = 옛 상한 16000의 79% — max_tokens 잘림이 invalid_json 의 유력 원인이라
// 24000으로 증액(1.9× 여유). 모델(claude-opus-4-8) 출력 상한 128K 내이고 출력은 생성분만 과금이라
// 상한 증액 자체는 비용 0. 트레이드오프는 wall 280s — 실측 처리율(~12.6K/103s)로 24K ≈ 200s 완주 가능,
// 32K부터는 wall 에 근접해 위험(그 전에 프롬프트 다이어트가 맞다).
const GENERATE_MAX_TOKENS = 24000
// ASM-042: 스트리밍이라 timeoutMs 는 idle(무이벤트) 캡 — 토큰이 흐르는 한 총 시간 제한이 아니다.
// 60s 무이벤트 = 죽은 연결(핑도 리셋시키므로). wall 은 핑만 오는 stall 백스톱 —
// 라우트 maxDuration(300s)보다 낮아야 플랫폼이 함수를 죽이기 전에 504 JSON(ai_timeout)을 직접 반환한다.
const GENERATE_IDLE_TIMEOUT_MS = 60000
const GENERATE_WALL_TIMEOUT_MS = 280000

export type GenerateResult =
  | { ok: true; design: WorkspaceDesign; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

// 관측 로그 프리픽스·본문 캡 — http.ts jsonServerError 관례([api:<scope>]) 준수.
// 본문 전문 금지: 텍스트는 꼬리 300자만(tail엔 아이디어 파생 텍스트가 올 수 있다 — 전문 노출만 차단).
const LOG_SCOPE = "[api:generate]"
const LOG_TAIL_MAX = 300

// 스트림 예외 관측(ASM-045, ASM-043 ⑧ 502 원인) — 분류 전에 원인 원형(이름·상태·메시지)을 남긴다.
function logStreamFailure(error: unknown): void {
  const detail =
    error instanceof AnthropicApiError
      ? { name: error.name, status: error.status, message: error.message.slice(0, LOG_TAIL_MAX) }
      : error instanceof Error
        ? { name: error.name, message: error.message.slice(0, LOG_TAIL_MAX) }
        : { value: String(error).slice(0, LOG_TAIL_MAX) }
  console.error(LOG_SCOPE, { stage: "stream", ...detail })
}

// 파싱 실패 관측(ASM-045) — invalid_json 이 잘림(max_tokens)인지 형식 문제인지 판정할 최소 사실만.
function logParseFailure(error: string, text: string, usage: AnthropicUsage | undefined): void {
  console.error(LOG_SCOPE, {
    stage: "parse",
    error,
    textLen: text.length,
    outputTokens: usage?.output_tokens,
    stopReason: usage?.stop_reason,
    tail: text.slice(-LOG_TAIL_MAX),
  })
}

// 아이디어 + 코드-진실 → 검증된 디자인 그래프. /api/generate 와 파일 생성 라우트가 공유한다.
// Anthropic 에러는 상태코드까지 분류해 돌려준다(라우트는 그대로 응답).
// 스트리밍은 서버 내부 누적 전용 — 응답 계약(단발 JSON)과 parseGeneratedDesign 무결성 경계는 그대로다.
// 재시도는 첫 토큰 전 일시 오류만(streamAnthropicWithRetry) — 유료 이중 호출 없음.
export async function runGenerate(idea: string, apis: Api[], dbTables: DbTable[]): Promise<GenerateResult> {
  const codeTruth = { apiIds: new Set(apis.map((a) => a.id)), dbTableIds: new Set(dbTables.map((t) => t.id)) }

  let text = ""
  let usage: AnthropicUsage | undefined
  try {
    usage = await streamAnthropicWithRetry(
      {
        system: GENERATE_SYSTEM,
        messages: [{ role: "user", content: buildGenerateUserMessage(idea, apis, dbTables) }],
        model: "opus",
        maxTokens: GENERATE_MAX_TOKENS,
        cacheSystem: true,
        thinking: "adaptive",
        timeoutMs: GENERATE_IDLE_TIMEOUT_MS,
        wallMs: GENERATE_WALL_TIMEOUT_MS,
      },
      (delta) => {
        text += delta
      }
    )
  } catch (error) {
    logStreamFailure(error)
    if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
    if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
    // 504 = 타임아웃(idle/wall) — 일반 API 오류와 카피·상태를 분리해 FE 가 정확히 안내(ai_timeout).
    if (error instanceof AnthropicApiError && error.status === 504) return { ok: false, error: "ai_timeout", status: 504 }
    if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
    return { ok: false, error: "server_error", status: 500 }
  }

  const parsed = parseGeneratedDesign(text, codeTruth)
  if (!parsed.ok) {
    logParseFailure(parsed.error, text, usage)
    return { ok: false, error: parsed.error, status: 422 }
  }

  return { ok: true, design: parsed.value, usage }
}

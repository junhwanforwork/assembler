import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import { streamAnthropicWithRetry } from "@/lib/anthropic-retry"
import { GENERATE_SYSTEM, buildGenerateUserMessage } from "@/lib/prompts/assembler-generate"
import { parseGeneratedDesign } from "./parse-design"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// opus + thinking 은 출력이 크고 느려 상한을 넉넉히.
const GENERATE_MAX_TOKENS = 16000
// ASM-042: 스트리밍이라 timeoutMs 는 idle(무이벤트) 캡 — 토큰이 흐르는 한 총 시간 제한이 아니다.
// 60s 무이벤트 = 죽은 연결(핑도 리셋시키므로). wall 은 핑만 오는 stall 백스톱 —
// 라우트 maxDuration(300s)보다 낮아야 플랫폼이 함수를 죽이기 전에 504 JSON(ai_timeout)을 직접 반환한다.
const GENERATE_IDLE_TIMEOUT_MS = 60000
const GENERATE_WALL_TIMEOUT_MS = 280000

export type GenerateResult =
  | { ok: true; design: WorkspaceDesign; usage?: AnthropicUsage }
  | { ok: false; error: string; status: number }

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
    if (error instanceof AnthropicKeyMissingError) return { ok: false, error: "ai_unavailable", status: 503 }
    if (error instanceof AnthropicRefusalError) return { ok: false, error: "ai_refused", status: 422 }
    // 504 = 타임아웃(idle/wall) — 일반 API 오류와 카피·상태를 분리해 FE 가 정확히 안내(ai_timeout).
    if (error instanceof AnthropicApiError && error.status === 504) return { ok: false, error: "ai_timeout", status: 504 }
    if (error instanceof AnthropicApiError) return { ok: false, error: "ai_error", status: 502 }
    return { ok: false, error: "server_error", status: 500 }
  }

  const parsed = parseGeneratedDesign(text, codeTruth)
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 422 }

  return { ok: true, design: parsed.value, usage }
}

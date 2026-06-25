import { NextResponse } from "next/server"
import {
  AnthropicKeyMissingError,
  AnthropicRefusalError,
} from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { extractJsonObject } from "@/lib/anthropic-json"
import { normalizeGraph } from "@/lib/graph/normalize"
import { ASSEMBLER_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"

// POST /api/generate — 아이디어(자연어) → 정규화된 ProjectGraph.
// 순수 변환만 — 영속(wf_projects 저장)은 ASS-024 autosave 경계(builder.ts 가 ProjectGraph 미수용).
// 에러는 해요체로만 — 기술 코드 노출 금지(ux-writing.md §3·§8).

const IDEA_MAX_LENGTH = 4000

// opus + thinking + 대용량 그래프 출력은 60s를 넘길 수 있다 — 함수 실행 상한을 늘린다(Vercel Fluid 기본 300s).
export const maxDuration = 300

// 세션 헤더는 어뷰즈·레이트리밋 추적의 1차 게이트 — generate 는 DB 를 안 건드려 소유권엔 안 쓴다(영속은 ASS-024).
function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

export async function POST(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { idea?: string }
  const idea = body.idea?.trim()
  if (!idea) return NextResponse.json({ error: "아이디어를 입력해 주세요." }, { status: 400 })
  // 길이 상한 — 인증 없이 opus 호출로 직결되므로 비용·어뷰즈 1차 방어.
  if (idea.length > IDEA_MAX_LENGTH) {
    return NextResponse.json({ error: "아이디어를 4,000자 이내로 입력해 주세요." }, { status: 400 })
  }

  let text: string
  try {
    // JSON 강제는 프롬프트 지시 + 정규화(ASS-019) — ProjectGraph 스키마는 structured outputs 문법 한도 초과(라이브 확인).
    const startedAt = Date.now()
    const result = await callAnthropicWithRetry({
      model: "opus",
      system: ASSEMBLER_SYSTEM,
      cacheSystem: true,
      thinking: "adaptive",
      maxTokens: 16000,
      timeoutMs: 240000,
      messages: [{ role: "user", content: buildAssemblerUserMessage(idea) }],
    })
    text = result.text
    // TTFV 베이스라인 — 생성 wall-clock·출력 토큰·캐시 적중을 남긴다(스트리밍 P0 전후 비교 근거).
    // cache_read=0 이면 cacheSystem 이 prefix 4096토큰 미만으로 no-op(P2 확인 항목).
    // TODO(P0 스트리밍): 스트리밍 착지로 베이스라인 측정이 끝나면 이 로그를 제거한다.
    console.info("[generate] baseline", {
      elapsedMs: Date.now() - startedAt,
      ideaLen: idea.length,
      outputTokens: result.usage?.output_tokens,
      inputTokens: result.usage?.input_tokens,
      cacheRead: result.usage?.cache_read_input_tokens ?? 0,
    })
  } catch (error) {
    return errorResponse(error)
  }

  let parsed: unknown
  try {
    // 펜스·프로즈 방어 후 파싱. max_tokens 초과로 잘리면 실패할 수 있음 → 일시 오류로 통일(503).
    parsed = JSON.parse(extractJsonObject(text))
  } catch {
    return NextResponse.json(
      { error: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    )
  }

  const graph = normalizeGraph(parsed)
  return NextResponse.json({ graph })
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AnthropicKeyMissingError) {
    return NextResponse.json(
      { error: "AI 설정을 확인해 주세요. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    )
  }
  if (error instanceof AnthropicRefusalError) {
    return NextResponse.json(
      { error: "이 아이디어로는 생성할 수 없어요. 다른 내용으로 시도해 주세요." },
      { status: 422 },
    )
  }
  // 재시도까지 소진한 일시 오류·기타 — 기술 코드 비노출.
  return NextResponse.json(
    { error: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요." },
    { status: 503 },
  )
}

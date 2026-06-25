import { NextResponse } from "next/server"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { normalizeQuestionnaire } from "@/lib/clarify/normalize"
import { CLARIFY_SCHEMA, CLARIFY_SYSTEM, buildClarifyUserMessage } from "@/lib/prompts/clarify"

// POST /api/clarify — 아이디어(자연어) → 생성 전 브리프 질문지(ClarifyQuestionnaire).
// structured outputs 로 JSON 강제 + normalizeQuestionnaire 로 의미 제약(문항/선택지 수·range 위생).
// 브리프는 보조 단계 — 실패·refusal·malformed 는 빈 질문지로 응답(클라가 바로-생성 폴백). 사용자를 막지 않는다.
// 에러 카피는 해요체(ux-writing §3·§8). 가드는 /api/generate 와 동일(세션·아이디어·4000자).

const IDEA_MAX_LENGTH = 4000

// sonnet 단발 + 작은 출력이라 짧다 — 그래도 무한 대기 방지로 상한.
export const maxDuration = 60

function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

export async function POST(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { idea?: string }
  const idea = body.idea?.trim()
  if (!idea) return NextResponse.json({ error: "아이디어를 입력해 주세요." }, { status: 400 })
  if (idea.length > IDEA_MAX_LENGTH) {
    return NextResponse.json({ error: "아이디어를 4,000자 이내로 입력해 주세요." }, { status: 400 })
  }

  try {
    const { text } = await callAnthropicWithRetry({
      model: "sonnet",
      system: CLARIFY_SYSTEM,
      cacheSystem: true,
      maxTokens: 2000,
      timeoutMs: 45000,
      outputSchema: CLARIFY_SCHEMA,
      messages: [{ role: "user", content: buildClarifyUserMessage(idea) }],
    })
    return NextResponse.json({ questionnaire: normalizeQuestionnaire(JSON.parse(text)) })
  } catch (error) {
    // 보조 단계 — 빈 질문지로 응답해 생성 흐름을 막지 않는다. 관측을 위해 로깅만.
    console.warn("[clarify] questionnaire generation failed", error instanceof Error ? error.message : error)
    return NextResponse.json({ questionnaire: { questions: [] } })
  }
}

import { NextResponse } from "next/server"
import {
  callAnthropic,
  AnthropicKeyMissingError,
  AnthropicApiError,
} from "@/lib/anthropic"
import { ASSEMBLER_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"
import { parseProjectGraph, GraphParseError } from "@/lib/assembler/parse-graph"

// POST /api/generate — 제품 아이디어 → 연결된 ProjectGraph(JSON).
// 도메인 계약은 rules/assembler/* (프롬프트가 주입). 여긴 호출·파싱·에러 변환만 담당한다.
// 에러는 api.md 규약대로 snake_case 코드로 — 클라이언트가 해요체 문구로 매핑한다.

const MAX_IDEA_LENGTH = 4000

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { idea?: string }
  const idea = body.idea?.trim()

  if (!idea) {
    return NextResponse.json({ error: "idea_required" }, { status: 400 })
  }
  if (idea.length > MAX_IDEA_LENGTH) {
    return NextResponse.json({ error: "idea_too_long" }, { status: 400 })
  }

  try {
    const text = await callAnthropic({
      system: ASSEMBLER_SYSTEM,
      messages: [{ role: "user", content: buildAssemblerUserMessage(idea) }],
      // 구조화 JSON 생성 — 추론 품질을 위해 sonnet, 안정성을 위해 낮은 temperature.
      model: "sonnet",
      maxTokens: 8192,
      temperature: 0.4,
    })
    const graph = parseProjectGraph(text)
    return NextResponse.json({ graph })
  } catch (err) {
    if (err instanceof AnthropicKeyMissingError) {
      return NextResponse.json({ error: "api_key_missing" }, { status: 503 })
    }
    if (err instanceof GraphParseError) {
      return NextResponse.json({ error: "invalid_graph" }, { status: 502 })
    }
    if (err instanceof AnthropicApiError) {
      const status = err.status >= 400 && err.status < 600 ? err.status : 502
      return NextResponse.json({ error: "generation_failed" }, { status })
    }
    return NextResponse.json({ error: "generation_failed" }, { status: 500 })
  }
}

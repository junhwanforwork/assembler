import { NextResponse } from "next/server"
import {
  AnthropicKeyMissingError,
  AnthropicRefusalError,
  type AnthropicUsage,
} from "@/lib/anthropic"
import { streamAnthropicWithRetry } from "@/lib/anthropic-retry"
import { extractJsonObject } from "@/lib/anthropic-json"
import { normalizeGraph } from "@/lib/graph/normalize"
import type { ProjectGraph } from "@/lib/types/assembler"
import { ASSEMBLER_STREAM_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"
import {
  isRawLayer,
  mergeRawLayer,
  type GraphStreamEvent,
} from "@/lib/graph/stream-protocol"

// POST /api/generate — 아이디어(자연어) → 정규화된 ProjectGraph를 레이어별로 스트리밍(ASS-204).
// 모델이 레이어별 1줄 NDJSON 방출 → 줄마다 누적 normalize → SSE 스냅샷. done 에서 최종 그래프(+백스톱).
// 에러는 해요체로만 — 기술 코드 노출 금지(ux-writing.md §3·§8).

const IDEA_MAX_LENGTH = 4000

// opus + thinking + 대용량 그래프 출력은 길다 — 함수 실행 상한을 늘린다(Vercel Fluid 기본 300s).
export const maxDuration = 300

function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

export async function POST(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { idea?: string; brief?: string }
  const idea = body.idea?.trim()
  if (!idea) return NextResponse.json({ error: "아이디어를 입력해 주세요." }, { status: 400 })
  // 길이 상한 — 인증 없이 opus 호출로 직결되므로 비용·어뷰즈 1차 방어.
  if (idea.length > IDEA_MAX_LENGTH) {
    return NextResponse.json({ error: "아이디어를 4,000자 이내로 입력해 주세요." }, { status: 400 })
  }
  // 생성 전 Clarify 답(ASS-211) — 있으면 user message 컨텍스트로 주입. 상한은 어뷰즈 1차 방어.
  const brief = body.brief?.trim().slice(0, IDEA_MAX_LENGTH) || undefined

  const encoder = new TextEncoder()
  const startedAt = Date.now()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GraphStreamEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

      let fullText = ""
      let lineBuffer = ""
      let cumulative: Record<string, unknown> = {}
      let layerCount = 0

      // 완성된 NDJSON 한 줄을 파싱·누적·정규화 후 스냅샷 송신. 미완·비-layer 줄은 스킵.
      const consumeLine = (raw: string) => {
        const line = raw.trim()
        if (!line) return
        let parsed: unknown
        try {
          parsed = JSON.parse(line)
        } catch {
          return
        }
        if (!isRawLayer(parsed)) return
        cumulative = mergeRawLayer(cumulative, parsed)
        layerCount += 1
        send({ type: "layer", layer: parsed.layer, graph: normalizeGraph(cumulative) })
      }

      try {
        const usage: AnthropicUsage | undefined = await streamAnthropicWithRetry(
          {
            model: "opus",
            system: ASSEMBLER_STREAM_SYSTEM,
            cacheSystem: true,
            thinking: "adaptive",
            maxTokens: 16000,
            timeoutMs: 240000, // idle(무토큰) 상한 — 청크 도착마다 리셋
            messages: [{ role: "user", content: buildAssemblerUserMessage(idea, { streaming: true, brief }) }],
          },
          (delta) => {
            fullText += delta
            lineBuffer += delta
            let nl: number
            while ((nl = lineBuffer.indexOf("\n")) !== -1) {
              const line = lineBuffer.slice(0, nl)
              lineBuffer = lineBuffer.slice(nl + 1)
              consumeLine(line)
            }
          },
        )

        // 개행 없이 끝난 마지막 줄 처리.
        consumeLine(lineBuffer)

        // 백스톱: NDJSON 한 줄도 못 받았으면(모델이 단일 객체 방출) 전체 버퍼를 단일 JSON으로 — 현행 단발과 동일.
        const finalGraph: ProjectGraph =
          layerCount === 0
            ? normalizeGraph(JSON.parse(extractJsonObject(fullText)))
            : normalizeGraph(cumulative)

        // TTFV 베이스라인 — 스트리밍 전후 비교 근거(elapsed·레이어수·출력토큰·캐시).
        console.info("[generate] stream baseline", {
          elapsedMs: Date.now() - startedAt,
          ideaLen: idea.length,
          layers: layerCount,
          outputTokens: usage?.output_tokens,
          inputTokens: usage?.input_tokens,
          cacheRead: usage?.cache_read_input_tokens ?? 0,
        })

        // pages 레이어가 maxTokens 한도로 잘려 유실되면(한 줄 대형 그래프) 화면 없는 그래프가 된다 — 운영 가시성.
        if (layerCount > 0 && finalGraph.pages.length === 0) {
          console.warn("[generate] stream: pages 레이어 미착(잘림 의심)", {
            ideaLen: idea.length,
            layers: layerCount,
          })
        }

        send({ type: "done", graph: finalGraph })
      } catch (error) {
        // 헤더 송신 후라 HTTP status 변경 불가 — 에러는 스트림 프레임으로(해요체).
        send({ type: "error", message: streamErrorMessage(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

// 스트림 중 오류 → 해요체 메시지(기술 코드 비노출). 키없음·refusal·기타 일시 오류 구분.
function streamErrorMessage(error: unknown): string {
  if (error instanceof AnthropicKeyMissingError) {
    return "AI 설정을 확인해 주세요. 잠시 후 다시 시도해 주세요."
  }
  if (error instanceof AnthropicRefusalError) {
    return "이 아이디어로는 생성할 수 없어요. 다른 내용으로 시도해 주세요."
  }
  return "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."
}

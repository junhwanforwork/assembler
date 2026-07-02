import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, listApis, listDbTables } from "@/lib/supabase/assembler-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { MAX_CHAT_TEXT_LENGTH, MAX_CHAT_TURNS, parseChatTurns } from "@/lib/api/validate"
import { runChat } from "@/lib/chat/run"

type Ctx = { params: Promise<{ id: string }> }

// 요청 body 상한 — 턴 수 × 텍스트 캡 + JSON 오버헤드 여유. 파서(길이 캡)가 최종 방어선.
const MAX_CHAT_BODY_BYTES = MAX_CHAT_TURNS * MAX_CHAT_TEXT_LENGTH * 4

// 에디터 AI 챗(ASM-006) — 그래프 질의응답 + 변경 계획(plan) 생성. 온디맨드(대화 영속 없음).
// 변경성 요청은 그래프에 직접 쓰지 않는다(#16) — plan 블록으로만 반환하고,
// 적용은 클라이언트가 applyChangePlan → PATCH design(ASM-010)으로 저장한다.
export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  if (contentLengthExceeds(request, MAX_CHAT_BODY_BYTES)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseChatTurns(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)

  // 유료 AI 호출 방어(ASM-001) — 초과 시 429 + Retry-After.
  const rl = await checkRateLimit(c, request, sessionId, "chat")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  let design, apis, dbTables
  try {
    const ctx = await getWorkspaceContext(c, id)
    if (!ctx) return jsonError("not_found", 404)
    design = ctx.design
    ;[apis, dbTables] = await Promise.all([listApis(c, ctx.productId), listDbTables(c, ctx.productId)])
  } catch (err) {
    return jsonServerError("workspaces/[id]/chat", err)
  }

  const result = await runChat(design, apis, dbTables, parsed.value)
  if (!result.ok) return jsonError(result.error, result.status)

  return jsonOk({ blocks: result.blocks, usage: result.usage })
}

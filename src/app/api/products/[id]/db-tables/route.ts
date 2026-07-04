import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct, listDbTables, syncDbTables } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { MAX_SYNC_BYTES, parseDbTableSync } from "@/lib/api/validate-sync"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"

type Ctx = { params: Promise<{ id: string }> }

// 코드-진실 읽기. Database도 Assembler 안에서 읽기전용 — 코드/MCP 싱크로만 갱신.
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ dbTables: await listDbTables(c, id) })
  } catch (err) {
    return jsonServerError("products/[id]/db-tables", err)
  }
}

// 싱크-인 — 수동 싱크-인 모달(ASM-026)과 코드/MCP 싱크 클라이언트가 호출한다. (product, name) 멱등 upsert.
// 인증은 다른 라우트와 동일한 세션(x-session-id)+RLS — 별도 MCP 토큰 게이트는 없다(rate limit 인프라와 묶어 후속, ASM-001).
export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  // 거대 body가 request.json()에서 통째로 버퍼링되기 전에 컷 — 파서의 바이트 캡이 최종 방어선.
  if (contentLengthExceeds(request, MAX_SYNC_BYTES)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseDbTableSync(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)

  // 무제한 대량 DB 쓰기 방어(ASM-028) — 검증 통과한 요청만 카운트, 초과 시 429 + Retry-After.
  const rl = await checkRateLimit(c, request, sessionId, "sync")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  try {
    if (!(await getProduct(c, id))) return jsonError("not_found", 404)
    const dbTables = await syncDbTables(c, id, parsed.value)
    await safeLogActivity(c, { productId: id, type: "db_tables_synced", metadata: { count: parsed.value.length } })
    return jsonOk({ dbTables })
  } catch (err) {
    return jsonServerError("products/[id]/db-tables", err)
  }
}

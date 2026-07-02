import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, isTableInWorkspace, listDbTables } from "@/lib/supabase/assembler-repo"
import { getDbTableNote, setUserEditedNote, upsertDbTableNote } from "@/lib/supabase/db-note-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { buildTableEvidence } from "@/lib/db-learning/evidence"
import { runDbLearning } from "@/lib/db-learning/run"

type Ctx = { params: Promise<{ id: string; tableId: string }> }

// DB Learning — 테이블 호버 AI 설명.
// 설명(추론)은 code-truth(asm_db_tables)와 분리된 asm_db_table_notes 에 저장. 워크스페이스 컨텍스트가 UIElement 증거를 준다.
//   GET   = 저장된 노트(없으면 null)
//   POST  = 생성·살균·저장(사용자 편집본은 덮지 않음)
//   PATCH = 사용자 편집(이후 AI 재생성이 덮지 않게 잠금)

// 대상 테이블이 이 워크스페이스의 제품 소유인지 확인하며 컨텍스트를 모은다. 미존재/타소유 → null.
async function loadContext(c: Awaited<ReturnType<typeof createAssemblerClient>>, workspaceId: string, tableId: string) {
  const ctx = await getWorkspaceContext(c, workspaceId)
  if (!ctx) return null
  const dbTables = await listDbTables(c, ctx.productId)
  const target = dbTables.find((t) => t.id === tableId)
  if (!target) return null
  return { ctx, dbTables, target }
}

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, tableId } = await params

  const c = await createAssemblerClient(sessionId)
  try {
    // URL 의 workspace↔table 정합 확인 — 불일치/타소유는 POST 와 동일하게 404(200 {note:null} 불일치 제거).
    // 호버 핫패스라 loadContext(design jsonb 전송) 대신 경량 포인트 조회.
    if (!(await isTableInWorkspace(c, id, tableId))) return jsonError("not_found", 404)
    const note = await getDbTableNote(c, tableId)
    return jsonOk({ note })
  } catch (err) {
    return jsonServerError("workspaces/[id]/db-tables/[tableId]/note", err)
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, tableId } = await params

  const c = await createAssemblerClient(sessionId)

  // 유료 haiku 호출 방어(ASM-001) — 초과 시 429 + Retry-After.
  const rl = await checkRateLimit(c, request, sessionId, "note")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  let loaded
  try {
    loaded = await loadContext(c, id, tableId)
  } catch (err) {
    return jsonServerError("workspaces/[id]/db-tables/[tableId]/note", err)
  }
  if (!loaded) return jsonError("not_found", 404)

  // 사용자가 고친 설명은 AI 재생성이 덮지 않는다 — 기존 편집본을 그대로 돌려준다.
  try {
    const existing = await getDbTableNote(c, tableId)
    if (existing?.isUserEdited) return jsonOk({ note: existing })
  } catch (err) {
    return jsonServerError("workspaces/[id]/db-tables/[tableId]/note", err)
  }

  const evidence = buildTableEvidence(loaded.target, loaded.dbTables, loaded.ctx.design)
  const result = await runDbLearning(evidence)
  if (!result.ok) return jsonError(result.error, result.status)

  try {
    const note = await upsertDbTableNote(c, {
      dbTableId: tableId,
      productId: loaded.ctx.productId,
      explanation: result.note.explanation,
      grounded: result.note.grounded,
    })
    return jsonOk({ note, usage: result.usage })
  } catch (err) {
    return jsonServerError("workspaces/[id]/db-tables/[tableId]/note", err)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, tableId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const explanation = typeof (body as { explanation?: unknown })?.explanation === "string" ? (body as { explanation: string }).explanation.trim() : ""
  // 설명은 한두 문단짜리 — 무한 길이 차단(상한 초과도 invalid).
  if (explanation.length === 0 || explanation.length > 2000) return jsonError("invalid_explanation", 400)

  const c = await createAssemblerClient(sessionId)
  try {
    // GET/POST 와 동일한 workspace↔table 정합 가드 — RLS 위에 defense-in-depth(경량 조회).
    if (!(await isTableInWorkspace(c, id, tableId))) return jsonError("not_found", 404)
    const note = await setUserEditedNote(c, tableId, explanation)
    if (!note) return jsonError("not_found", 404)
    return jsonOk({ note })
  } catch (err) {
    return jsonServerError("workspaces/[id]/db-tables/[tableId]/note", err)
  }
}

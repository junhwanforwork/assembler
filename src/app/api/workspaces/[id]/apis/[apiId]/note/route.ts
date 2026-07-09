import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, listApis, listDbTables } from "@/lib/supabase/assembler-repo"
import { getApiNote, isApiInWorkspace, setUserEditedApiNote, upsertApiNote } from "@/lib/supabase/api-note-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { buildApiEvidence } from "@/lib/api-learning/evidence"
import { runApiLearning } from "@/lib/api-learning/run"

type Ctx = { params: Promise<{ id: string; apiId: string }> }

// API 해석(ASM-064) — 엔드포인트 AI 설명. db 노트 라우트와 1:1 계약.
// 설명(추론)은 code-truth(asm_apis)와 분리된 asm_api_notes 에 저장. 워크스페이스 design 이 Feature 증거를 준다.
//   GET   = 저장된 노트(없으면 null)
//   POST  = 생성·살균·저장(사용자 편집본은 덮지 않음) — 유료(haiku), 명시 트리거 전용
//   PATCH = 사용자 편집(이후 AI 재생성이 덮지 않게 잠금)

// 대상 API가 이 워크스페이스의 제품 소유인지 확인하며 컨텍스트를 모은다. 미존재/타소유 → null.
async function loadContext(c: Awaited<ReturnType<typeof createAssemblerClient>>, workspaceId: string, apiId: string) {
  const ctx = await getWorkspaceContext(c, workspaceId)
  if (!ctx) return null
  const apis = await listApis(c, ctx.productId)
  const target = apis.find((a) => a.id === apiId)
  if (!target) return null
  const dbTables = await listDbTables(c, ctx.productId)
  return { ctx, target, dbTables }
}

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, apiId } = await params

  const c = await createAssemblerClient(sessionId)
  try {
    // URL 의 workspace↔api 정합 확인 — 불일치/타소유는 POST 와 동일하게 404.
    // 호버 핫패스라 loadContext(design jsonb 전송) 대신 경량 포인트 조회.
    if (!(await isApiInWorkspace(c, id, apiId))) return jsonError("not_found", 404)
    const note = await getApiNote(c, apiId)
    return jsonOk({ note })
  } catch (err) {
    return jsonServerError("workspaces/[id]/apis/[apiId]/note", err)
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, apiId } = await params

  const c = await createAssemblerClient(sessionId)

  // 유료 haiku 호출 방어(ASM-001) — 기존 "note" 스코프 재사용(신규 스코프는 RPC 인자 가드 fail-open 함정).
  const rl = await checkRateLimit(c, request, sessionId, "note")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  let loaded
  try {
    loaded = await loadContext(c, id, apiId)
  } catch (err) {
    return jsonServerError("workspaces/[id]/apis/[apiId]/note", err)
  }
  if (!loaded) return jsonError("not_found", 404)

  // 사용자가 고친 설명은 AI 재생성이 덮지 않는다 — 기존 편집본을 그대로 돌려준다.
  try {
    const existing = await getApiNote(c, apiId)
    if (existing?.isUserEdited) return jsonOk({ note: existing })
  } catch (err) {
    return jsonServerError("workspaces/[id]/apis/[apiId]/note", err)
  }

  const evidence = buildApiEvidence(loaded.target, loaded.dbTables, loaded.ctx.design)
  const result = await runApiLearning(evidence)
  if (!result.ok) return jsonError(result.error, result.status)

  try {
    const note = await upsertApiNote(c, {
      apiId,
      productId: loaded.ctx.productId,
      explanation: result.note.explanation,
      grounded: result.note.grounded,
      pros: result.note.pros,
      cons: result.note.cons,
    })
    return jsonOk({ note, usage: result.usage })
  } catch (err) {
    return jsonServerError("workspaces/[id]/apis/[apiId]/note", err)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, apiId } = await params

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
    // GET/POST 와 동일한 workspace↔api 정합 가드 — RLS 위에 defense-in-depth(경량 조회).
    if (!(await isApiInWorkspace(c, id, apiId))) return jsonError("not_found", 404)
    const note = await setUserEditedApiNote(c, apiId, explanation)
    if (!note) return jsonError("not_found", 404)
    return jsonOk({ note })
  } catch (err) {
    return jsonServerError("workspaces/[id]/apis/[apiId]/note", err)
  }
}

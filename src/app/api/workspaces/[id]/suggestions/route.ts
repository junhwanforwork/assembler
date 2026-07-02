import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, listApis, listDbTables } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { runSuggestions } from "@/lib/suggestions/run"

type Ctx = { params: Promise<{ id: string }> }

// 워크스페이스 그래프 + 제품 코드-진실 → AI 분석 제안. 온디맨드(영속 없음).
// POST = 명시적 AI 액션(/generate 관례). 대시보드는 Main 워크스페이스 id로 호출.
export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  const c = await createAssemblerClient(sessionId)

  // 유료 AI 호출 방어(ASM-001) — 초과 시 429 + Retry-After.
  const rl = await checkRateLimit(c, request, sessionId, "suggestions")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  let design, apis, dbTables
  try {
    const ctx = await getWorkspaceContext(c, id)
    if (!ctx) return jsonError("not_found", 404)
    design = ctx.design
    ;[apis, dbTables] = await Promise.all([listApis(c, ctx.productId), listDbTables(c, ctx.productId)])
  } catch (err) {
    return jsonServerError("workspaces/[id]/suggestions", err)
  }

  const result = await runSuggestions(design, apis, dbTables)
  if (!result.ok) return jsonError(result.error, result.status)

  return jsonOk({ suggestions: result.suggestions, usage: result.usage })
}

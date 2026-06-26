import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, updateDesign } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import { parseDesign } from "@/lib/api/validate"
import { findDanglingRefs } from "@/lib/types/design"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const ctx = await getWorkspaceContext(c, id)
    return ctx ? jsonOk({ design: ctx.design }) : jsonError("not_found", 404)
  } catch {
    return jsonError("server_error", 500)
  }
}

// 디자인 그래프 저장. 카디널 룰 "고립 산출물 금지" — 끊어진 참조가 있으면 저장 거부(409).
export async function PUT(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseDesign(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  try {
    const ctx = await getWorkspaceContext(c, id)
    if (!ctx) return jsonError("not_found", 404)

    const dangling = findDanglingRefs(parsed.value, ctx.codeTruth)
    if (dangling.length > 0) return jsonOk({ error: "dangling_refs", refs: dangling }, 409)

    const saved = await updateDesign(c, id, parsed.value)
    return saved ? jsonOk({ saved: true }) : jsonError("not_found", 404)
  } catch {
    return jsonError("server_error", 500)
  }
}

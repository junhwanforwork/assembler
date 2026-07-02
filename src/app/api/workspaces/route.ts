import { createAssemblerClient } from "@/lib/supabase/assembler"
import { createWorkspace, listWorkspaces } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { parseCreateWorkspace } from "@/lib/api/validate"

// ?productId= 의 워크스페이스 목록. 소유권은 부모 RLS에 위임.
export async function GET(request: Request) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const productId = new URL(request.url).searchParams.get("productId")
  if (!productId) return jsonError("invalid_product_id", 400)

  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ workspaces: await listWorkspaces(c, productId) })
  } catch (err) {
    return jsonServerError("workspaces", err)
  }
}

export async function POST(request: Request) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseCreateWorkspace(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)
  // ifNone(ASM-027) — 스펙이 하나도 없을 때만 생성(온보딩 T7 "메인" 자동 생성 전용).
  // 존재 판정을 서버 한 요청 안으로 옮겨 클라 GET→POST 사이 TOCTOU 창을 닫는다
  // ("메인" 2개 완전 차단은 (product_id, name) 유니크 제약 필요 — ASM-021류 BE 후속).
  const ifNone = (body as { ifNone?: unknown }).ifNone === true

  const c = await createAssemblerClient(sessionId)
  try {
    if (ifNone) {
      const existing = await listWorkspaces(c, parsed.value.productId)
      if (existing.length > 0) return jsonOk({ skipped: true })
    }
    const workspace = await createWorkspace(c, parsed.value)
    await safeLogActivity(c, {
      productId: workspace.productId,
      workspaceId: workspace.id,
      type: "workspace_created",
      metadata: { name: workspace.name },
    })
    return jsonOk(workspace, 201)
  } catch (err) {
    return jsonServerError("workspaces", err)
  }
}

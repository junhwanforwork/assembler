import { createAssemblerClient } from "@/lib/supabase/assembler"
import { deleteWorkspace, getWorkspace, updateWorkspace } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const workspace = await getWorkspace(c, id)
    return workspace ? jsonOk(workspace) : jsonError("not_found", 404)
  } catch {
    return jsonError("server_error", 500)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const name = (body as { name?: unknown }).name
  if (typeof name !== "string" || name.trim().length === 0) return jsonError("invalid_name", 400)

  const c = await createAssemblerClient(sessionId)
  try {
    const workspace = await updateWorkspace(c, id, { name: name.trim() })
    if (!workspace) return jsonError("not_found", 404)
    await safeLogActivity(c, {
      productId: workspace.productId,
      workspaceId: workspace.id,
      type: "workspace_renamed",
      metadata: { name: workspace.name },
    })
    return jsonOk(workspace)
  } catch {
    return jsonError("server_error", 500)
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    // 삭제 전에 product/name 확보 — 삭제 후엔 워크스페이스가 사라져 참조·메타를 못 만든다.
    const workspace = await getWorkspace(c, id)
    if (!workspace) return jsonError("not_found", 404)
    const deleted = await deleteWorkspace(c, id)
    if (!deleted) return jsonError("not_found", 404)
    // 워크스페이스가 삭제됐으므로 제품 단위 이벤트(workspaceId=null), 이름은 메타로 보존.
    await safeLogActivity(c, {
      productId: workspace.productId,
      workspaceId: null,
      type: "workspace_deleted",
      metadata: { name: workspace.name },
    })
    return jsonOk({ deleted: true })
  } catch {
    return jsonError("server_error", 500)
  }
}

import { createAssemblerClient } from "@/lib/supabase/assembler"
import { createWorkspace, listWorkspaces } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
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
  } catch {
    return jsonError("server_error", 500)
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

  const c = await createAssemblerClient(sessionId)
  try {
    const workspace = await createWorkspace(c, parsed.value)
    await safeLogActivity(c, {
      productId: workspace.productId,
      workspaceId: workspace.id,
      type: "workspace_created",
      metadata: { name: workspace.name },
    })
    return jsonOk(workspace, 201)
  } catch {
    return jsonError("server_error", 500)
  }
}

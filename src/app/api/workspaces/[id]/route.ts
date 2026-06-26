import { createAssemblerClient } from "@/lib/supabase/assembler"
import { deleteWorkspace, getWorkspace, updateWorkspace } from "@/lib/supabase/assembler-repo"
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
    return workspace ? jsonOk(workspace) : jsonError("not_found", 404)
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
    const deleted = await deleteWorkspace(c, id)
    return deleted ? jsonOk({ deleted: true }) : jsonError("not_found", 404)
  } catch {
    return jsonError("server_error", 500)
  }
}

import { createAssemblerClient } from "@/lib/supabase/assembler"
import { deleteProduct, getProduct, updateProduct } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import { parseUpdateProduct } from "@/lib/api/validate"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const product = await getProduct(c, id)
    return product ? jsonOk(product) : jsonError("not_found", 404)
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
  const parsed = parseUpdateProduct(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  try {
    const product = await updateProduct(c, id, parsed.value)
    return product ? jsonOk(product) : jsonError("not_found", 404)
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
    const deleted = await deleteProduct(c, id)
    return deleted ? jsonOk({ deleted: true }) : jsonError("not_found", 404)
  } catch {
    return jsonError("server_error", 500)
  }
}

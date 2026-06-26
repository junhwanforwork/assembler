import { createAssemblerClient, getAuthedUserId } from "@/lib/supabase/assembler"
import { createProduct, listProducts } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import { parseCreateProduct } from "@/lib/api/validate"

// 세션 소유의 프로덕트 목록. RLS가 소유권을 강제하므로 추가 필터 불필요.
export async function GET(request: Request) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ products: await listProducts(c) })
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
  const parsed = parseCreateProduct(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  const userId = await getAuthedUserId(c)
  try {
    return jsonOk(await createProduct(c, sessionId, userId, parsed.value), 201)
  } catch {
    return jsonError("server_error", 500)
  }
}

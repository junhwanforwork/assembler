import { runGenerate } from "@/lib/generate/run"
import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct, listApis, listDbTables } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError, MAX_IDEA_LENGTH } from "@/lib/api/http"
import type { Api, DbTable } from "@/lib/types/assembler"

// 아이디어 → 연결된 디자인 그래프(미저장 미리보기). productId가 있으면 코드-진실을 참조로 넘긴다.
export async function POST(request: Request) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  if (typeof body !== "object" || body === null) return jsonError("invalid_body", 400)
  const idea = (body as { idea?: unknown }).idea
  const productId = (body as { productId?: unknown }).productId
  if (typeof idea !== "string" || idea.trim().length === 0 || idea.length > MAX_IDEA_LENGTH) return jsonError("invalid_idea", 400)
  if (productId !== undefined && typeof productId !== "string") return jsonError("invalid_product_id", 400)

  const c = await createAssemblerClient(sessionId)

  let apis: Api[] = []
  let dbTables: DbTable[] = []
  try {
    if (typeof productId === "string") {
      if (!(await getProduct(c, productId))) return jsonError("not_found", 404)
      ;[apis, dbTables] = await Promise.all([listApis(c, productId), listDbTables(c, productId)])
    }
  } catch (err) {
    return jsonServerError("generate", err)
  }

  const result = await runGenerate(idea.trim(), apis, dbTables)
  if (!result.ok) return jsonError(result.error, result.status)

  return jsonOk({ design: result.design, usage: result.usage })
}

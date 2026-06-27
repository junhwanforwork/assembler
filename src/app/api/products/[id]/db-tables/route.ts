import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct, listDbTables, syncDbTables } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import { parseDbTableSync } from "@/lib/api/validate-sync"

type Ctx = { params: Promise<{ id: string }> }

// 코드-진실 읽기. Database도 Assembler 안에서 읽기전용 — 코드/MCP 싱크로만 갱신.
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ dbTables: await listDbTables(c, id) })
  } catch {
    return jsonError("server_error", 500)
  }
}

// 싱크-인(코드/MCP 전용). (product, name) 멱등 upsert.
export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseDbTableSync(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  try {
    if (!(await getProduct(c, id))) return jsonError("not_found", 404)
    const dbTables = await syncDbTables(c, id, parsed.value)
    await safeLogActivity(c, { productId: id, type: "db_tables_synced", metadata: { count: parsed.value.length } })
    return jsonOk({ dbTables })
  } catch {
    return jsonError("server_error", 500)
  }
}

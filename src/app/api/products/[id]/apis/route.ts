import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct, listApis, syncApis } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import { parseApiSync } from "@/lib/api/validate-sync"

type Ctx = { params: Promise<{ id: string }> }

// 코드-진실 읽기. Assembler 안에서 API는 읽기전용 — 추가/편집은 코드/MCP 싱크로만.
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ apis: await listApis(c, id) })
  } catch {
    return jsonError("server_error", 500)
  }
}

// 싱크-인(코드/MCP 전용). 멱등 upsert. 사용자 UI에서 호출하는 경로가 아니다.
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
  const parsed = parseApiSync(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  try {
    if (!(await getProduct(c, id))) return jsonError("not_found", 404)
    return jsonOk({ apis: await syncApis(c, id, parsed.value) })
  } catch {
    return jsonError("server_error", 500)
  }
}

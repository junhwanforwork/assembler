import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError } from "@/lib/anthropic"
import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { GENERATE_SYSTEM, buildGenerateUserMessage } from "@/lib/prompts/assembler-generate"
import { parseGeneratedDesign } from "@/lib/generate/parse-design"
import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct, listApis, listDbTables } from "@/lib/supabase/assembler-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"
import type { Api, DbTable } from "@/lib/types/assembler"

// opus + thinking 은 출력이 크고 느려 상한을 넉넉히.
const GENERATE_MAX_TOKENS = 16000
const GENERATE_TIMEOUT_MS = 120000

// 아이디어 → 연결된 디자인 그래프 생성. productId가 있으면 그 프로덕트의 코드-진실을 참조로 넘긴다.
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
  if (typeof idea !== "string" || idea.trim().length === 0) return jsonError("invalid_idea", 400)
  if (productId !== undefined && typeof productId !== "string") return jsonError("invalid_product_id", 400)

  const c = await createAssemblerClient(sessionId)

  let apis: Api[] = []
  let dbTables: DbTable[] = []
  try {
    if (typeof productId === "string") {
      if (!(await getProduct(c, productId))) return jsonError("not_found", 404)
      ;[apis, dbTables] = await Promise.all([listApis(c, productId), listDbTables(c, productId)])
    }
  } catch {
    return jsonError("server_error", 500)
  }

  const codeTruth = { apiIds: new Set(apis.map((a) => a.id)), dbTableIds: new Set(dbTables.map((t) => t.id)) }

  let text: string
  let usage
  try {
    const result = await callAnthropicWithRetry({
      system: GENERATE_SYSTEM,
      messages: [{ role: "user", content: buildGenerateUserMessage(idea.trim(), apis, dbTables) }],
      model: "opus",
      maxTokens: GENERATE_MAX_TOKENS,
      cacheSystem: true,
      thinking: "adaptive",
      timeoutMs: GENERATE_TIMEOUT_MS,
    })
    text = result.text
    usage = result.usage
  } catch (error) {
    if (error instanceof AnthropicKeyMissingError) return jsonError("ai_unavailable", 503)
    if (error instanceof AnthropicRefusalError) return jsonError("ai_refused", 422)
    if (error instanceof AnthropicApiError) return jsonError("ai_error", 502)
    return jsonError("server_error", 500)
  }

  const parsed = parseGeneratedDesign(text, codeTruth)
  if (!parsed.ok) return jsonError(parsed.error, 422)

  return jsonOk({ design: parsed.value, usage })
}

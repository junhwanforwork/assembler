import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getProduct } from "@/lib/supabase/assembler-repo"
import { createPolicyDoc, listPolicyDocs } from "@/lib/supabase/policy-doc-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { MAX_POLICY_BODY_BYTES, parseCreatePolicyDoc } from "./validate"

type Ctx = { params: Promise<{ id: string }> }

// 정책 문서(ASM-068) 컬렉션 — 사용자 저작 md 문서. 부모(제품)당 N개.
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ docs: await listPolicyDocs(c, id) })
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs", err)
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  // 거대 body가 request.json()에서 버퍼링되기 전에 컷 — 파서 바이트 캡이 최종 방어선(여유분 포함).
  if (contentLengthExceeds(request, MAX_POLICY_BODY_BYTES + 8_192)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseCreatePolicyDoc(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)

  // 저비용 DB 쓰기 방어 — 기존 "sync" 스코프 재사용(신규 스코프는 RPC 인자 가드 fail-open 함정).
  const rl = await checkRateLimit(c, request, sessionId, "sync")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  try {
    if (!(await getProduct(c, id))) return jsonError("not_found", 404)
    const doc = await createPolicyDoc(c, {
      productId: id,
      title: parsed.value.title,
      body: parsed.value.body,
      apiIds: parsed.value.apiIds,
      dbTableIds: parsed.value.dbTableIds,
    })
    await safeLogActivity(c, { productId: id, type: "policy_doc_created", metadata: { title: doc.title } })
    return jsonOk({ doc }, 201)
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs", err)
  }
}

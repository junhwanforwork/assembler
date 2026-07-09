import { createAssemblerClient } from "@/lib/supabase/assembler"
import { deletePolicyDoc, getPolicyDoc, updatePolicyDoc } from "@/lib/supabase/policy-doc-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { MAX_POLICY_BODY_BYTES, parseUpdatePolicyDoc } from "../validate"

type Ctx = { params: Promise<{ id: string; docId: string }> }

// 정책 문서(ASM-068) 단건 — GET/PATCH/DELETE. 소유권은 RLS가 강제(문서→제품 cascade).
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, docId } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const doc = await getPolicyDoc(c, docId)
    // 경로의 product id와 문서 소속이 일치해야 함(RLS로 타소유는 이미 막히나, 같은 소유자 내 잘못된
    // product 경로 접근을 404로 — 13차 통합 정정, 크로스체크 LOW).
    return doc && doc.productId === id ? jsonOk({ doc }) : jsonError("not_found", 404)
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs/[docId]", err)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, docId } = await params

  if (contentLengthExceeds(request, MAX_POLICY_BODY_BYTES + 8_192)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseUpdatePolicyDoc(body)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const c = await createAssemblerClient(sessionId)
  // 512KB body 쓰기 증폭 방어 — POST와 동일 "sync" 스코프(보안 리뷰 LOW, 13차 통합 정정).
  const rl = await checkRateLimit(c, request, sessionId, "sync")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)
  try {
    // product 경로 대조 후 수정(잘못된 product 경로로 남의 product 문서 수정 차단 — LOW 정정).
    const existing = await getPolicyDoc(c, docId)
    if (!existing || existing.productId !== id) return jsonError("not_found", 404)
    const doc = await updatePolicyDoc(c, docId, parsed.value)
    if (!doc) return jsonError("not_found", 404)
    await safeLogActivity(c, { productId: doc.productId, type: "policy_doc_updated", metadata: { title: doc.title } })
    return jsonOk({ doc })
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs/[docId]", err)
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id, docId } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    // 삭제 전에 product/title 확보 — 삭제 후엔 문서가 사라져 활동 로그 메타를 못 만든다.
    const doc = await getPolicyDoc(c, docId)
    if (!doc || doc.productId !== id) return jsonError("not_found", 404)
    const deleted = await deletePolicyDoc(c, docId)
    if (!deleted) return jsonError("not_found", 404)
    await safeLogActivity(c, { productId: doc.productId, type: "policy_doc_deleted", metadata: { title: doc.title } })
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs/[docId]", err)
  }
}

import { createAssemblerClient } from "@/lib/supabase/assembler"
import { deletePolicyDoc, getPolicyDoc, updatePolicyDoc } from "@/lib/supabase/policy-doc-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { MAX_POLICY_BODY_BYTES, parseUpdatePolicyDoc } from "../validate"

type Ctx = { params: Promise<{ id: string; docId: string }> }

// 정책 문서(ASM-068) 단건 — GET/PATCH/DELETE. 소유권은 RLS가 강제(문서→제품 cascade).
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { docId } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const doc = await getPolicyDoc(c, docId)
    return doc ? jsonOk({ doc }) : jsonError("not_found", 404)
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs/[docId]", err)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { docId } = await params

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
  try {
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
  const { docId } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    // 삭제 전에 product/title 확보 — 삭제 후엔 문서가 사라져 활동 로그 메타를 못 만든다.
    const doc = await getPolicyDoc(c, docId)
    if (!doc) return jsonError("not_found", 404)
    const deleted = await deletePolicyDoc(c, docId)
    if (!deleted) return jsonError("not_found", 404)
    await safeLogActivity(c, { productId: doc.productId, type: "policy_doc_deleted", metadata: { title: doc.title } })
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonServerError("products/[id]/policy-docs/[docId]", err)
  }
}

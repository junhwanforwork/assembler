import { createAssemblerClient } from "@/lib/supabase/assembler"
import { getWorkspaceContext, updateDesign } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { MAX_DESIGN_BYTES, jsonByteLength, parseDesign, parseDesignPatch } from "@/lib/api/validate"
import { findDanglingRefs, mergeDesignPatch } from "@/lib/types/design"
import { diffDesign, toActivityDelta } from "@/lib/assembler/diff"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    const ctx = await getWorkspaceContext(c, id)
    return ctx ? jsonOk({ design: ctx.design }) : jsonError("not_found", 404)
  } catch (err) {
    return jsonServerError("workspaces/[id]/design", err)
  }
}

// 디자인 그래프 저장. 카디널 룰 "고립 산출물 금지" — 끊어진 참조가 있으면 저장 거부(409).
export async function PUT(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  // 거대 body가 request.json()에서 통째로 버퍼링되기 전에 컷 — 파서의 바이트 캡이 최종 방어선.
  if (contentLengthExceeds(request, MAX_DESIGN_BYTES)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseDesign(body)
  // Content-Length 헤더 없는(chunked) 거대 body도 413로 — 크기 초과는 경로와 무관하게 같은 상태코드.
  if (!parsed.ok) return jsonError(parsed.error, parsed.error === "payload_too_large" ? 413 : 400)

  const c = await createAssemblerClient(sessionId)
  try {
    const ctx = await getWorkspaceContext(c, id)
    if (!ctx) return jsonError("not_found", 404)

    const dangling = findDanglingRefs(parsed.value, ctx.codeTruth)
    if (dangling.length > 0) return jsonOk({ error: "dangling_refs", refs: dangling }, 409)

    // counts 대신 객체·연결 단위 델타(P1) — "무엇이 바뀌었나"를 저장 1회 단위로 복원 가능하게.
    // 저장 전에 계산 — 비정형 old로 throw해도 커밋 후 500(저장됐는데 실패 응답)이 안 된다.
    const delta = toActivityDelta(diffDesign(ctx.design, parsed.value))

    // CAS — 읽기(dangling 검사 기준)와 쓰기 사이에 다른 저장이 끼면 거부(409). 재시도로 해소.
    const saved = await updateDesign(c, id, parsed.value, ctx.updatedAt)
    if (!saved) return jsonError("conflict", 409)
    await safeLogActivity(c, {
      productId: ctx.productId,
      workspaceId: id,
      // name도 스냅샷 — 워크스페이스 삭제(set null) 후에도 타임라인 귀속 보존.
      type: "design_updated",
      metadata: { name: ctx.name, delta },
    })
    return jsonOk({ saved: true })
  } catch (err) {
    return jsonServerError("workspaces/[id]/design", err)
  }
}

// 스코프드 부분 저장(ASM-010) — 편집 인터랙션·변경 계획 도크 "적용하기"가 바뀐 컬렉션만 보낸다.
// 준 컬렉션은 통째 교체, 안 준 컬렉션은 저장본 유지. dangling 가드는 머지 결과 그래프 전체에 —
// 부분 저장이 다른 컬렉션의 연결을 끊고 지나가지 못하게(409).
export async function PATCH(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params

  if (contentLengthExceeds(request, MAX_DESIGN_BYTES)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const parsed = parseDesignPatch(body)
  if (!parsed.ok) return jsonError(parsed.error, parsed.error === "payload_too_large" ? 413 : 400)

  const c = await createAssemblerClient(sessionId)
  try {
    const ctx = await getWorkspaceContext(c, id)
    if (!ctx) return jsonError("not_found", 404)

    const merged = mergeDesignPatch(ctx.design, parsed.value)
    // 패치 자체는 작아도 머지 결과가 캡을 넘을 수 있다 — 저장 전 최종 크기 검사.
    if (jsonByteLength(merged) > MAX_DESIGN_BYTES) return jsonError("payload_too_large", 413)

    const dangling = findDanglingRefs(merged, ctx.codeTruth)
    if (dangling.length > 0) return jsonOk({ error: "dangling_refs", refs: dangling }, 409)

    // 부분 저장도 델타 기준은 머지 결과 전체 그래프 — 패치 밖 컬렉션은 무변경으로 나온다.
    const delta = toActivityDelta(diffDesign(ctx.design, merged))

    // CAS — "안 준 컬렉션은 저장본 유지" 계약은 읽기 시점 저장본 기준이다.
    // 그 사이 다른 저장이 끼면 여기서 거부(409)해 부분 저장 유실·dangling 가드 우회를 막는다.
    const saved = await updateDesign(c, id, merged, ctx.updatedAt)
    if (!saved) return jsonError("conflict", 409)
    await safeLogActivity(c, {
      productId: ctx.productId,
      workspaceId: id,
      type: "design_updated",
      metadata: { name: ctx.name, delta },
    })
    // 서버가 머지한 최종본을 돌려줘 클라이언트 스토어가 어긋나지 않게 한다.
    return jsonOk({ saved: true, design: merged })
  } catch (err) {
    return jsonServerError("workspaces/[id]/design", err)
  }
}

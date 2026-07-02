import type { WorkspaceDesign } from "@/lib/types/assembler"

// 경계 검증 — 신뢰할 수 없는 요청 body를 도메인 입력으로 좁힌다(any 금지, 런타임 가드).

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

export function parseCreateProduct(body: unknown): Parsed<{ name: string; description: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (!isNonEmptyString(body.name)) return { ok: false, error: "invalid_name" }
  if (body.description !== undefined && typeof body.description !== "string") return { ok: false, error: "invalid_description" }
  return { ok: true, value: { name: body.name.trim(), description: typeof body.description === "string" ? body.description : "" } }
}

export function parseUpdateProduct(body: unknown): Parsed<{ name?: string; description?: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  const patch: { name?: string; description?: string } = {}
  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) return { ok: false, error: "invalid_name" }
    patch.name = body.name.trim()
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return { ok: false, error: "invalid_description" }
    patch.description = body.description
  }
  if (patch.name === undefined && patch.description === undefined) return { ok: false, error: "empty_patch" }
  return { ok: true, value: patch }
}

export function parseCreateWorkspace(body: unknown): Parsed<{ productId: string; name: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (!isNonEmptyString(body.productId)) return { ok: false, error: "invalid_product_id" }
  if (body.name !== undefined && typeof body.name !== "string") return { ok: false, error: "invalid_name" }
  const name = isNonEmptyString(body.name) ? body.name.trim() : "Main"
  return { ok: true, value: { productId: body.productId, name } }
}

const DESIGN_COLLECTIONS = ["requirements", "features", "pages", "flows", "wireframes", "elements"] as const

// ASM-004 — 거대 jsonb 방어. 캡은 생성 플로우 최대치(~24 elements)의 10배 이상으로 정상 사용엔 안 걸린다.
// 바이트 캡은 중첩 배열·문자열 폭주까지 한 방에 커버(개수 캡이 못 잡는 형태).
export const MAX_DESIGN_COLLECTION_ITEMS = 300
export const MAX_DESIGN_BYTES = 1_000_000

// UTF-8 실바이트 측정 — .length(UTF-16 코드유닛)는 한글 페이로드에서 실제 크기의 ~1/3로 샌다.
const ENCODER = new TextEncoder()
export function jsonByteLength(v: unknown): number {
  return ENCODER.encode(JSON.stringify(v)).length
}

// LLM/클라이언트가 id는 주고 배열 필드를 빠뜨려도(valid JSON) 다운스트림 sanitize/findDanglingRefs가
// undefined.filter / for..of 로 던지지 않게 좁힌다. 없거나 비배열이면 빈 배열로 정규화.
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function objArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter(isRecord) : []
}

function normalizeDesign(body: Record<string, unknown>): WorkspaceDesign {
  const rows = (key: string) => body[key] as Record<string, unknown>[]
  return {
    requirements: rows("requirements").map((r) => ({ ...r, acceptanceCriteria: strArray(r.acceptanceCriteria) })),
    features: rows("features").map((f) => ({
      ...f,
      detailFeatures: objArray(f.detailFeatures),
      requirementIds: strArray(f.requirementIds),
      pageIds: strArray(f.pageIds),
      apiIds: strArray(f.apiIds),
    })),
    // wireframeId 누락(undefined)은 null 로 — findDanglingRefs 가 "없음"과 "끊어진 참조"를 구분하게.
    pages: rows("pages").map((p) => ({ ...p, wireframeId: typeof p.wireframeId === "string" ? p.wireframeId : null })),
    flows: rows("flows").map((fl) => ({ ...fl, edges: objArray(fl.edges) })),
    wireframes: rows("wireframes").map((w) => ({ ...w, elementIds: strArray(w.elementIds) })),
    elements: rows("elements").map((e) => ({
      ...e,
      states: objArray(e.states),
      apiIds: strArray(e.apiIds),
      dbTableIds: strArray(e.dbTableIds),
    })),
  } as unknown as WorkspaceDesign
}

export function parseDesign(body: unknown): Parsed<WorkspaceDesign> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (jsonByteLength(body) > MAX_DESIGN_BYTES) return { ok: false, error: "payload_too_large" }
  for (const key of DESIGN_COLLECTIONS) {
    if (!Array.isArray(body[key])) return { ok: false, error: "invalid_design_shape" }
    if ((body[key] as unknown[]).length > MAX_DESIGN_COLLECTION_ITEMS) return { ok: false, error: "design_too_large" }
  }
  for (const key of DESIGN_COLLECTIONS) {
    for (const item of body[key] as unknown[]) {
      if (!isRecord(item) || typeof item.id !== "string") return { ok: false, error: "invalid_design_item" }
    }
  }
  return { ok: true, value: normalizeDesign(body) }
}

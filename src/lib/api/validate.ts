import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { DesignPatch } from "@/lib/types/design"
import type { ChatTurn } from "@/lib/types/chat"

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

type DesignCollectionKey = (typeof DESIGN_COLLECTIONS)[number]

// 컬렉션별 정규화 — 전체 저장(parseDesign)과 스코프드 패치(parseDesignPatch)가 같은 규율을 공유한다.
const COLLECTION_NORMALIZERS: Record<DesignCollectionKey, (row: Record<string, unknown>) => Record<string, unknown>> = {
  requirements: (r) => ({ ...r, acceptanceCriteria: strArray(r.acceptanceCriteria) }),
  features: (f) => ({
    ...f,
    detailFeatures: objArray(f.detailFeatures),
    requirementIds: strArray(f.requirementIds),
    pageIds: strArray(f.pageIds),
    apiIds: strArray(f.apiIds),
    dbTableIds: strArray(f.dbTableIds),
  }),
  // wireframeId 누락(undefined)은 null 로 — findDanglingRefs 가 "없음"과 "끊어진 참조"를 구분하게.
  pages: (p) => ({ ...p, wireframeId: typeof p.wireframeId === "string" ? p.wireframeId : null }),
  flows: (fl) => ({ ...fl, edges: objArray(fl.edges) }),
  wireframes: (w) => ({ ...w, elementIds: strArray(w.elementIds) }),
  elements: (e) => ({
    ...e,
    states: objArray(e.states),
    apiIds: strArray(e.apiIds),
    dbTableIds: strArray(e.dbTableIds),
  }),
}

// 배열·개수 캡·항목 id·중복 id 검사 — 통과하면 null, 아니면 에러 코드.
function collectionError(key: DesignCollectionKey, value: unknown): string | null {
  if (!Array.isArray(value)) return "invalid_design_shape"
  if (value.length > MAX_DESIGN_COLLECTION_ITEMS) return "design_too_large"
  const ids = new Set<string>()
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") return "invalid_design_item"
    // 같은 컬렉션 안 중복 id는 참조를 모호하게 만든다(findDanglingRefs는 Set이라 못 잡음).
    if (ids.has(item.id)) return "duplicate_design_id"
    ids.add(item.id)
    // flow edge의 참조 필드는 findDanglingRefs가 string으로 신뢰한다 — 경계에서 못박는다.
    if (key === "flows" && Array.isArray(item.edges)) {
      for (const edge of item.edges) {
        if (!isRecord(edge)) continue // 비객체 edge는 정규화(objArray)가 버린다.
        if (typeof edge.id !== "string" || typeof edge.fromPageId !== "string" || typeof edge.toPageId !== "string") {
          return "invalid_design_item"
        }
      }
    }
  }
  return null
}

function normalizeCollection(key: DesignCollectionKey, value: unknown): Record<string, unknown>[] {
  return (value as Record<string, unknown>[]).map(COLLECTION_NORMALIZERS[key])
}

// 항목 하나를 컬렉션 규율로 검증·정규화 — 챗 변경 계획 payload 살균용(ASM-006).
// 여기를 통과한 항목은 PATCH 경계(collectionError)를 반드시 통과한다 — 도크의 "적용하기" 데드엔드 방지.
export function normalizeDesignItem(key: DesignCollectionKey, item: Record<string, unknown>): Record<string, unknown> | null {
  if (collectionError(key, [item])) return null
  return normalizeCollection(key, [item])[0]
}

export function parseDesign(body: unknown): Parsed<WorkspaceDesign> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (jsonByteLength(body) > MAX_DESIGN_BYTES) return { ok: false, error: "payload_too_large" }
  for (const key of DESIGN_COLLECTIONS) {
    const error = collectionError(key, body[key])
    if (error) return { ok: false, error }
  }
  const normalized = Object.fromEntries(DESIGN_COLLECTIONS.map((key) => [key, normalizeCollection(key, body[key])]))
  return { ok: true, value: normalized as unknown as WorkspaceDesign }
}

// ASM-010 — 스코프드 부분 업데이트 경계 검증. 준(known) 컬렉션만 검증·정규화해 담는다.
// 저장본과의 머지는 mergeDesignPatch, 머지 결과의 참조 무결성은 findDanglingRefs 몫.
export function parseDesignPatch(body: unknown): Parsed<DesignPatch> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (jsonByteLength(body) > MAX_DESIGN_BYTES) return { ok: false, error: "payload_too_large" }

  const given = DESIGN_COLLECTIONS.filter((key) => body[key] !== undefined)
  if (given.length === 0) return { ok: false, error: "empty_patch" }

  for (const key of given) {
    const error = collectionError(key, body[key])
    if (error) return { ok: false, error }
  }
  const normalized = Object.fromEntries(given.map((key) => [key, normalizeCollection(key, body[key])]))
  return { ok: true, value: normalized as DesignPatch }
}

// ASM-006 — 에디터 AI 챗 요청 경계. 턴 수·길이·바이트 캡은 유료 호출 비용/DoS 방어.
export const MAX_CHAT_TURNS = 20
export const MAX_CHAT_TEXT_LENGTH = 4000
// 턴 수 × 텍스트 캡 + JSON 오버헤드 여유. Content-Length 없는(chunked) body도 여기서 걸린다.
export const MAX_CHAT_BODY_BYTES = MAX_CHAT_TURNS * MAX_CHAT_TEXT_LENGTH * 4

export function parseChatTurns(body: unknown): Parsed<ChatTurn[]> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  // messages 밖 무시되는 키에 거대 페이로드를 실어 보내는 우회까지 body 전체 크기로 컷.
  if (jsonByteLength(body) > MAX_CHAT_BODY_BYTES) return { ok: false, error: "payload_too_large" }
  const raw = body.messages
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "invalid_messages" }
  if (raw.length > MAX_CHAT_TURNS) return { ok: false, error: "too_many_messages" }

  const turns: ChatTurn[] = []
  for (const item of raw) {
    if (!isRecord(item)) return { ok: false, error: "invalid_messages" }
    if (item.role !== "user" && item.role !== "assistant") return { ok: false, error: "invalid_messages" }
    if (typeof item.text !== "string") return { ok: false, error: "invalid_messages" }
    const text = item.text.trim()
    if (text.length > MAX_CHAT_TEXT_LENGTH) return { ok: false, error: "message_too_long" }
    if (text.length === 0) return { ok: false, error: "invalid_messages" }
    turns.push({ role: item.role, text })
  }
  // Anthropic Messages API는 첫 메시지 role=user를 요구 — 챗 UI의 인사말 패턴은 드롭한다.
  while (turns.length > 0 && turns[0].role === "assistant") turns.shift()
  // 마지막 턴 = 이번 요청의 질문. assistant로 끝나면 모델에 물을 게 없다.
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") return { ok: false, error: "invalid_messages" }
  return { ok: true, value: turns }
}

import { jsonByteLength, type Parsed } from "@/lib/api/validate"

// 정책 문서(ASM-068) 입력 검증 — 사용자 저작 경로(코드-진실 싱크와 분리).
// title 1~200자 · body 바이트 캡(문자열 폭주 방어) · 참조 id 개수 캡.

export const MAX_POLICY_TITLE_LENGTH = 200
// md 본문 상한 — validate-sync MAX_SYNC_BYTES 와 동일 급(사용자가 쓰는 문서라 여유 있게).
export const MAX_POLICY_BODY_BYTES = 512_000
// 한 문서가 참조하는 API/테이블 개수 상한 — 실사용의 수 배.
export const MAX_POLICY_REF_IDS = 200

export type CreatePolicyDocInput = { title: string; body: string; apiIds: string[]; dbTableIds: string[] }
export type UpdatePolicyDocInput = { title?: string; body?: string; apiIds?: string[]; dbTableIds?: string[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

// title: 문자열 + 트림 후 1~200자. 실패 시 에러 코드, 성공 시 트림값.
function checkTitle(v: unknown): Parsed<string> {
  if (typeof v !== "string") return { ok: false, error: "invalid_title" }
  const title = v.trim()
  if (title.length === 0 || title.length > MAX_POLICY_TITLE_LENGTH) return { ok: false, error: "invalid_title" }
  return { ok: true, value: title }
}

// body: 문자열 + 바이트 캡. 실패 시 에러 코드.
function checkBody(v: unknown): Parsed<string> {
  if (typeof v !== "string") return { ok: false, error: "invalid_body_content" }
  if (jsonByteLength(v) > MAX_POLICY_BODY_BYTES) return { ok: false, error: "payload_too_large" }
  return { ok: true, value: v }
}

// 참조 배열: 문자열 배열 + 개수 캡. 실패 시 에러 코드.
function checkRefs(v: unknown): Parsed<string[]> {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) return { ok: false, error: "invalid_refs" }
  if (v.length > MAX_POLICY_REF_IDS) return { ok: false, error: "too_many_refs" }
  return { ok: true, value: v as string[] }
}

export function parseCreatePolicyDoc(body: unknown): Parsed<CreatePolicyDocInput> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }

  const title = checkTitle(body.title)
  if (!title.ok) return title

  let bodyText = ""
  if (body.body !== undefined) {
    const b = checkBody(body.body)
    if (!b.ok) return b
    bodyText = b.value
  }

  let apiIds: string[] = []
  if (body.apiIds !== undefined) {
    const r = checkRefs(body.apiIds)
    if (!r.ok) return r
    apiIds = r.value
  }

  let dbTableIds: string[] = []
  if (body.dbTableIds !== undefined) {
    const r = checkRefs(body.dbTableIds)
    if (!r.ok) return r
    dbTableIds = r.value
  }

  return { ok: true, value: { title: title.value, body: bodyText, apiIds, dbTableIds } }
}

export function parseUpdatePolicyDoc(body: unknown): Parsed<UpdatePolicyDocInput> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  const patch: UpdatePolicyDocInput = {}

  if (body.title !== undefined) {
    const title = checkTitle(body.title)
    if (!title.ok) return title
    patch.title = title.value
  }
  if (body.body !== undefined) {
    const b = checkBody(body.body)
    if (!b.ok) return b
    patch.body = b.value
  }
  if (body.apiIds !== undefined) {
    const r = checkRefs(body.apiIds)
    if (!r.ok) return r
    patch.apiIds = r.value
  }
  if (body.dbTableIds !== undefined) {
    const r = checkRefs(body.dbTableIds)
    if (!r.ok) return r
    patch.dbTableIds = r.value
  }

  if (patch.title === undefined && patch.body === undefined && patch.apiIds === undefined && patch.dbTableIds === undefined) {
    return { ok: false, error: "empty_patch" }
  }
  return { ok: true, value: patch }
}

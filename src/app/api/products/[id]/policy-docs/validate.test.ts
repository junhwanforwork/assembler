import { describe, it, expect } from "vitest"
import { MAX_POLICY_BODY_BYTES, MAX_POLICY_REF_IDS, parseCreatePolicyDoc, parseUpdatePolicyDoc } from "./validate"

// ASM-068 — 정책 문서(작성형) 입력 검증. title 1~200자·body 바이트 캡·참조 id 개수 캡.

describe("parseCreatePolicyDoc", () => {
  it("title만 있으면 body/apiIds/dbTableIds는 기본값으로 채운다", () => {
    const r = parseCreatePolicyDoc({ title: "요금 정책" })
    expect(r).toEqual({ ok: true, value: { title: "요금 정책", body: "", apiIds: [], dbTableIds: [] } })
  })

  it("title을 트림하고 body·참조를 그대로 담는다", () => {
    const r = parseCreatePolicyDoc({ title: "  권한 구조  ", body: "# 권한\n관리자만", apiIds: ["a1"], dbTableIds: ["t1", "t2"] })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ title: "권한 구조", body: "# 권한\n관리자만", apiIds: ["a1"], dbTableIds: ["t1", "t2"] })
  })

  it("body가 아닌 객체는 invalid_body", () => {
    expect(parseCreatePolicyDoc("nope")).toEqual({ ok: false, error: "invalid_body" })
    expect(parseCreatePolicyDoc(null)).toEqual({ ok: false, error: "invalid_body" })
  })

  it("title이 비었거나 공백뿐이면 invalid_title", () => {
    expect(parseCreatePolicyDoc({ title: "   " })).toEqual({ ok: false, error: "invalid_title" })
    expect(parseCreatePolicyDoc({})).toEqual({ ok: false, error: "invalid_title" })
  })

  it("title 200자 초과는 invalid_title", () => {
    expect(parseCreatePolicyDoc({ title: "가".repeat(201) })).toEqual({ ok: false, error: "invalid_title" })
  })

  it("body가 문자열이 아니면 invalid_body_content", () => {
    expect(parseCreatePolicyDoc({ title: "t", body: 3 })).toEqual({ ok: false, error: "invalid_body_content" })
  })

  it("body 바이트 캡 초과는 payload_too_large", () => {
    const big = "a".repeat(MAX_POLICY_BODY_BYTES + 1)
    expect(parseCreatePolicyDoc({ title: "t", body: big })).toEqual({ ok: false, error: "payload_too_large" })
  })

  it("apiIds/dbTableIds가 배열이 아니면 invalid_refs", () => {
    expect(parseCreatePolicyDoc({ title: "t", apiIds: "x" })).toEqual({ ok: false, error: "invalid_refs" })
    expect(parseCreatePolicyDoc({ title: "t", dbTableIds: {} })).toEqual({ ok: false, error: "invalid_refs" })
  })

  it("참조 항목이 문자열이 아니면 invalid_refs", () => {
    expect(parseCreatePolicyDoc({ title: "t", apiIds: ["ok", 3] })).toEqual({ ok: false, error: "invalid_refs" })
  })

  it("참조 개수 캡 초과는 too_many_refs", () => {
    const many = Array.from({ length: MAX_POLICY_REF_IDS + 1 }, (_, i) => `id-${i}`)
    expect(parseCreatePolicyDoc({ title: "t", apiIds: many })).toEqual({ ok: false, error: "too_many_refs" })
  })
})

describe("parseUpdatePolicyDoc", () => {
  it("주어진 필드만 담는다", () => {
    const r = parseUpdatePolicyDoc({ body: "새 본문" })
    expect(r).toEqual({ ok: true, value: { body: "새 본문" } })
  })

  it("title은 트림·검증한다", () => {
    expect(parseUpdatePolicyDoc({ title: "  " })).toEqual({ ok: false, error: "invalid_title" })
    const r = parseUpdatePolicyDoc({ title: "  새 제목 " })
    if (r.ok) expect(r.value.title).toBe("새 제목")
  })

  it("아무 필드도 없으면 empty_patch", () => {
    expect(parseUpdatePolicyDoc({})).toEqual({ ok: false, error: "empty_patch" })
  })

  it("apiIds만 갱신할 수 있다", () => {
    const r = parseUpdatePolicyDoc({ apiIds: ["a1"], dbTableIds: [] })
    expect(r).toEqual({ ok: true, value: { apiIds: ["a1"], dbTableIds: [] } })
  })

  it("body 바이트 캡·참조 캡은 create와 동일하게 적용된다", () => {
    expect(parseUpdatePolicyDoc({ body: "a".repeat(MAX_POLICY_BODY_BYTES + 1) })).toEqual({ ok: false, error: "payload_too_large" })
    const many = Array.from({ length: MAX_POLICY_REF_IDS + 1 }, (_, i) => `id-${i}`)
    expect(parseUpdatePolicyDoc({ dbTableIds: many })).toEqual({ ok: false, error: "too_many_refs" })
  })
})

import { describe, it, expect } from "vitest"
import { parseCreateProduct, parseUpdateProduct, parseCreateWorkspace, parseDesign, parseDesignPatch, MAX_DESIGN_COLLECTION_ITEMS, MAX_DESIGN_BYTES } from "./validate"

// 경계 검증 — 라우트 진입에서 신뢰할 수 없는 body를 도메인 입력으로 좁힌다.
// 깊은 연결 무결성(끊어진 참조)은 findDanglingRefs가 따로 맡는다.

describe("parseCreateProduct", () => {
  it("name 필수, description 기본 빈 문자열", () => {
    expect(parseCreateProduct({ name: "내 앱" })).toEqual({ ok: true, value: { name: "내 앱", description: "" } })
    expect(parseCreateProduct({ name: "내 앱", description: "설명" })).toEqual({ ok: true, value: { name: "내 앱", description: "설명" } })
  })
  it("name 누락/빈값/비문자열 거부", () => {
    expect(parseCreateProduct({})).toEqual({ ok: false, error: "invalid_name" })
    expect(parseCreateProduct({ name: "  " })).toEqual({ ok: false, error: "invalid_name" })
    expect(parseCreateProduct({ name: 1 })).toEqual({ ok: false, error: "invalid_name" })
    expect(parseCreateProduct(null)).toEqual({ ok: false, error: "invalid_body" })
  })
})

describe("parseUpdateProduct", () => {
  it("부분 갱신 — 준 필드만 통과", () => {
    expect(parseUpdateProduct({ name: "새 이름" })).toEqual({ ok: true, value: { name: "새 이름" } })
    expect(parseUpdateProduct({ description: "d" })).toEqual({ ok: true, value: { description: "d" } })
  })
  it("빈 패치/잘못된 타입 거부", () => {
    expect(parseUpdateProduct({})).toEqual({ ok: false, error: "empty_patch" })
    expect(parseUpdateProduct({ name: 1 })).toEqual({ ok: false, error: "invalid_name" })
  })
})

describe("parseCreateWorkspace", () => {
  it("productId 필수, name 기본 Main", () => {
    expect(parseCreateWorkspace({ productId: "p-1" })).toEqual({ ok: true, value: { productId: "p-1", name: "Main" } })
    expect(parseCreateWorkspace({ productId: "p-1", name: "결제" })).toEqual({ ok: true, value: { productId: "p-1", name: "결제" } })
  })
  it("productId 누락 거부", () => {
    expect(parseCreateWorkspace({ name: "x" })).toEqual({ ok: false, error: "invalid_product_id" })
  })
})

describe("parseDesign", () => {
  const empty = { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] }
  it("6개 컬렉션이 배열이면 통과", () => {
    expect(parseDesign(empty)).toEqual({ ok: true, value: empty })
  })
  it("컬렉션 누락/비배열 거부", () => {
    const { features, ...missing } = empty
    void features
    expect(parseDesign(missing)).toEqual({ ok: false, error: "invalid_design_shape" })
    expect(parseDesign({ ...empty, pages: {} })).toEqual({ ok: false, error: "invalid_design_shape" })
    expect(parseDesign(null)).toEqual({ ok: false, error: "invalid_body" })
  })
  it("항목에 문자열 id가 없으면 거부", () => {
    expect(parseDesign({ ...empty, requirements: [{ title: "x" }] })).toEqual({ ok: false, error: "invalid_design_item" })
  })

  // ASM-004 — 거대 jsonb 방어: 개수·바이트 캡을 검증 경계에서 컷(400).
  it("컬렉션이 캡 이내면 통과, 초과하면 design_too_large", () => {
    const atCap = Array.from({ length: MAX_DESIGN_COLLECTION_ITEMS }, (_, i) => ({ id: `r-${i}` }))
    const over = [...atCap, { id: "r-over" }]
    expect(parseDesign({ ...empty, requirements: atCap }).ok).toBe(true)
    expect(parseDesign({ ...empty, requirements: over })).toEqual({ ok: false, error: "design_too_large" })
  })
  it("직렬화 크기가 바이트 캡을 넘으면 payload_too_large (개수 검사보다 먼저)", () => {
    const huge = { ...empty, requirements: [{ id: "r-1", title: "x".repeat(MAX_DESIGN_BYTES) }] }
    expect(parseDesign(huge)).toEqual({ ok: false, error: "payload_too_large" })
  })
})

// ASM-010 — 스코프드 부분 업데이트. 준 컬렉션만 검증·정규화하고,
// 안 준 컬렉션은 건드리지 않는다(머지는 mergeDesignPatch 몫).
describe("parseDesignPatch", () => {
  it("준 컬렉션만 통과 — 나머지 키는 값에 없다", () => {
    const result = parseDesignPatch({ requirements: [{ id: "r-1", title: "로그인" }] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value)).toEqual(["requirements"])
      expect(result.value.requirements?.[0].id).toBe("r-1")
    }
  })
  it("여러 컬렉션 동시 패치 허용", () => {
    const result = parseDesignPatch({
      pages: [{ id: "p-1", name: "홈", wireframeId: null }],
      elements: [{ id: "el-1", label: "버튼" }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(Object.keys(result.value).sort()).toEqual(["elements", "pages"])
  })
  it("배열 필드 누락을 빈 배열로 정규화한다 (parseDesign과 동일 규율)", () => {
    const result = parseDesignPatch({ features: [{ id: "f-1", name: "인증" }] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const f = result.value.features?.[0] as unknown as Record<string, unknown>
      expect(f.requirementIds).toEqual([])
      expect(f.pageIds).toEqual([])
      expect(f.apiIds).toEqual([])
      expect(f.detailFeatures).toEqual([])
    }
  })
  it("알 수 없는 키만 있으면 empty_patch", () => {
    expect(parseDesignPatch({})).toEqual({ ok: false, error: "empty_patch" })
    expect(parseDesignPatch({ unknown: [] })).toEqual({ ok: false, error: "empty_patch" })
  })
  it("비객체 body 거부", () => {
    expect(parseDesignPatch(null)).toEqual({ ok: false, error: "invalid_body" })
    expect(parseDesignPatch([])).toEqual({ ok: false, error: "invalid_body" })
  })
  it("컬렉션이 배열이 아니면 invalid_design_shape", () => {
    expect(parseDesignPatch({ pages: {} })).toEqual({ ok: false, error: "invalid_design_shape" })
  })
  it("항목에 문자열 id가 없으면 invalid_design_item", () => {
    expect(parseDesignPatch({ requirements: [{ title: "x" }] })).toEqual({ ok: false, error: "invalid_design_item" })
  })
  it("개수 캡 초과 시 design_too_large", () => {
    const over = Array.from({ length: MAX_DESIGN_COLLECTION_ITEMS + 1 }, (_, i) => ({ id: `r-${i}` }))
    expect(parseDesignPatch({ requirements: over })).toEqual({ ok: false, error: "design_too_large" })
  })
  it("직렬화 크기가 바이트 캡을 넘으면 payload_too_large", () => {
    const huge = { requirements: [{ id: "r-1", title: "x".repeat(MAX_DESIGN_BYTES) }] }
    expect(parseDesignPatch(huge)).toEqual({ ok: false, error: "payload_too_large" })
  })
})

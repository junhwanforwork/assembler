import { describe, expect, it } from "vitest"
import { extractDanglingRefs } from "./design-patch"

// 네트워크 왕복(patchDesignScoped)은 모킹 금지 규칙상 단위 테스트 대상 아님 — 순수부만.

describe("extractDanglingRefs — 409 dangling_refs 응답 body 해석", () => {
  it("refs 배열을 꺼낸다", () => {
    const refs = [{ from: "feature:f1", field: "requirementIds", missingId: "req-x", kind: "requirement" }]
    expect(extractDanglingRefs({ error: "dangling_refs", refs })).toEqual(refs)
  })

  it("refs가 없거나 body가 비정형이면 빈 배열", () => {
    expect(extractDanglingRefs({ error: "dangling_refs" })).toEqual([])
    expect(extractDanglingRefs({ refs: "배열 아님" })).toEqual([])
    expect(extractDanglingRefs(null)).toEqual([])
    expect(extractDanglingRefs("문자열")).toEqual([])
  })

  it("형태 이상 요소는 걸러낸다 — 정상 요소만 남긴다(PatchErrorNote 크래시 방지)", () => {
    const good = { from: "feature:f1", field: "apiIds", missingId: "api-x", kind: "api" }
    const refs = [
      good,
      null,
      "문자열",
      { from: "feature:f2" }, // 필드 누락
      { from: "feature:f3", field: "pageIds", missingId: 42, kind: "page" }, // missingId 타입 이상
      { from: "feature:f4", field: "pageIds", missingId: "p-x", kind: "unknown-kind" }, // kind 밖
    ]
    expect(extractDanglingRefs({ error: "dangling_refs", refs })).toEqual([good])
  })
})

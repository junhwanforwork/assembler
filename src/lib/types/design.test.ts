import { describe, it, expect } from "vitest"
import { createEmptyDesign, designCounts, findDanglingRefs, mergeDesignPatch } from "./design"
import type { WorkspaceDesign } from "./assembler"

// 카디널 룰: 모든 것은 연결된다(고립 산출물 금지). findDanglingRefs는
// "참조하는데 대상이 없는" 끊어진 연결을 전부 잡아낸다.

function baseDesign(): WorkspaceDesign {
  return {
    requirements: [
      { id: "req-1", title: "로그인", description: "", status: "approved", priority: "high", role: "user", acceptanceCriteria: [] },
    ],
    features: [
      {
        id: "feat-1",
        name: "인증",
        description: "",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: ["page-1"],
        apiIds: ["api-1"],
      },
    ],
    pages: [{ id: "page-1", name: "로그인 화면", description: "", wireframeId: "wf-1" }],
    flows: [
      { id: "flow-1", name: "로그인 흐름", edges: [{ id: "e-1", fromPageId: "page-1", toPageId: "page-1", trigger: "로그인 성공" }] },
    ],
    wireframes: [{ id: "wf-1", elementIds: ["el-1"] }],
    elements: [
      { id: "el-1", label: "로그인 버튼", type: "button", action: "자격 검증", states: [], result: "홈으로 이동", apiIds: ["api-1"], dbTableIds: ["db-1"] },
    ],
  }
}

describe("createEmptyDesign", () => {
  it("모든 컬렉션이 빈 배열인 그래프를 만든다", () => {
    const d = createEmptyDesign()
    expect(d).toEqual({ requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] })
  })
})

describe("designCounts", () => {
  it("빈 그래프는 전부 0", () => {
    expect(designCounts(createEmptyDesign())).toEqual({ requirements: 0, features: 0, pages: 0, flows: 0, wireframes: 0, elements: 0 })
  })
  it("컬렉션별 길이를 센다 (파일 카드 메타용)", () => {
    expect(designCounts(baseDesign())).toEqual({ requirements: 1, features: 1, pages: 1, flows: 1, wireframes: 1, elements: 1 })
  })
})

describe("findDanglingRefs", () => {
  it("연결이 온전하면 끊어진 참조가 없다 (code-truth id 제공 시)", () => {
    const refs = findDanglingRefs(baseDesign(), { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })
    expect(refs).toEqual([])
  })

  it("feature → requirement 끊어진 참조를 잡는다", () => {
    const d = baseDesign()
    d.features[0].requirementIds = ["req-404"]
    const refs = findDanglingRefs(d)
    expect(refs).toContainEqual({ from: "feature:feat-1", field: "requirementIds", missingId: "req-404", kind: "requirement" })
  })

  it("feature → page 끊어진 참조를 잡는다", () => {
    const d = baseDesign()
    d.features[0].pageIds = ["page-404"]
    expect(findDanglingRefs(d)).toContainEqual({ from: "feature:feat-1", field: "pageIds", missingId: "page-404", kind: "page" })
  })

  it("page → wireframe 끊어진 참조를 잡고, null이면 무시한다", () => {
    const d = baseDesign()
    d.pages[0].wireframeId = "wf-404"
    expect(findDanglingRefs(d)).toContainEqual({ from: "page:page-1", field: "wireframeId", missingId: "wf-404", kind: "wireframe" })

    const d2 = baseDesign()
    d2.pages[0].wireframeId = null
    expect(findDanglingRefs(d2, { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })).toEqual([])
  })

  it("wireframe → element 끊어진 참조를 잡는다", () => {
    const d = baseDesign()
    d.wireframes[0].elementIds = ["el-404"]
    expect(findDanglingRefs(d)).toContainEqual({ from: "wireframe:wf-1", field: "elementIds", missingId: "el-404", kind: "element" })
  })

  it("flow edge → page 끊어진 참조를 from/to 양쪽 다 잡는다", () => {
    const d = baseDesign()
    d.flows[0].edges[0].fromPageId = "page-x"
    d.flows[0].edges[0].toPageId = "page-y"
    const refs = findDanglingRefs(d)
    expect(refs).toContainEqual({ from: "flow:flow-1/edge:e-1", field: "fromPageId", missingId: "page-x", kind: "flowPage" })
    expect(refs).toContainEqual({ from: "flow:flow-1/edge:e-1", field: "toPageId", missingId: "page-y", kind: "flowPage" })
  })

  it("element → api 끊어진 참조는 code-truth id가 제공될 때만 잡는다", () => {
    const d = baseDesign()
    d.elements[0].apiIds = ["api-404"]
    // code-truth 미제공 → api/db 참조는 검사 생략(끊어진 거 없음)
    expect(findDanglingRefs(d)).toEqual([])
    // code-truth 제공 → 잡는다
    expect(findDanglingRefs(d, { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })).toContainEqual({
      from: "element:el-1",
      field: "apiIds",
      missingId: "api-404",
      kind: "api",
    })
  })

  it("element → dbTable, feature → api 끊어진 참조도 code-truth 기준으로 잡는다", () => {
    const d = baseDesign()
    d.elements[0].dbTableIds = ["db-404"]
    d.features[0].apiIds = ["api-404"]
    const refs = findDanglingRefs(d, { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })
    expect(refs).toContainEqual({ from: "element:el-1", field: "dbTableIds", missingId: "db-404", kind: "dbTable" })
    expect(refs).toContainEqual({ from: "feature:feat-1", field: "apiIds", missingId: "api-404", kind: "api" })
  })

  it("feature → dbTable 끊어진 참조도 code-truth 기준으로 잡는다 (ASM-052 승격)", () => {
    const d = baseDesign()
    d.features[0].dbTableIds = ["db-404"]
    const refs = findDanglingRefs(d, { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })
    expect(refs).toContainEqual({ from: "feature:feat-1", field: "dbTableIds", missingId: "db-404", kind: "dbTable" })
    // 필드 부재(레거시 저장 데이터)는 끊어진 참조가 아니다 — 크래시 0 원칙.
    const legacy = baseDesign()
    delete (legacy.features[0] as { dbTableIds?: string[] }).dbTableIds
    expect(() => findDanglingRefs(legacy, { apiIds: new Set(["api-1"]), dbTableIds: new Set(["db-1"]) })).not.toThrow()
  })
})

// ASM-010 — 스코프드 부분 업데이트의 머지 규칙: 준 컬렉션은 통째 교체, 안 준 컬렉션은 저장본 유지.
describe("mergeDesignPatch", () => {
  it("패치에 있는 컬렉션만 교체하고 나머지는 유지한다", () => {
    const current = baseDesign()
    const newReq = { id: "req-2", title: "회원가입", description: "", status: "draft" as const, priority: "medium" as const, role: "user", acceptanceCriteria: [] }
    const merged = mergeDesignPatch(current, { requirements: [newReq] })
    expect(merged.requirements).toEqual([newReq])
    expect(merged.features).toEqual(current.features)
    expect(merged.pages).toEqual(current.pages)
    expect(merged.flows).toEqual(current.flows)
    expect(merged.wireframes).toEqual(current.wireframes)
    expect(merged.elements).toEqual(current.elements)
  })
  it("빈 배열 패치는 해당 컬렉션 비우기다 (누락과 구분)", () => {
    const merged = mergeDesignPatch(baseDesign(), { elements: [] })
    expect(merged.elements).toEqual([])
    expect(merged.requirements.length).toBe(1)
  })
  it("원본을 변형하지 않는다 (순수 함수)", () => {
    const current = baseDesign()
    const snapshot = JSON.parse(JSON.stringify(current))
    mergeDesignPatch(current, { pages: [] })
    expect(current).toEqual(snapshot)
  })
  it("빈 패치는 저장본과 동일한 그래프를 돌려준다", () => {
    const current = baseDesign()
    expect(mergeDesignPatch(current, {})).toEqual(current)
  })
})

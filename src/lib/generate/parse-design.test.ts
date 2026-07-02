import { describe, it, expect } from "vitest"
import { parseGeneratedDesign } from "./parse-design"
import type { WorkspaceDesign } from "@/lib/types/assembler"

// 생성 그래프 파싱 — AI 출력 텍스트를 신뢰할 수 있는 디자인 그래프로 좁힌다.
// 코드-진실 참조 환각은 제거, 내부 연결은 무결(카디널 룰)이어야 통과.

function coherent(): WorkspaceDesign {
  return {
    requirements: [{ id: "req-1", title: "로그인", description: "", status: "approved", priority: "high", role: "user", acceptanceCriteria: [] }],
    features: [{ id: "feat-1", name: "인증", description: "", detailFeatures: [], requirementIds: ["req-1"], pageIds: ["page-1"], apiIds: [] }],
    pages: [{ id: "page-1", name: "로그인", description: "", wireframeId: "wf-1" }],
    flows: [],
    wireframes: [{ id: "wf-1", elementIds: ["el-1"] }],
    elements: [{ id: "el-1", label: "로그인 버튼", type: "button", action: "검증", states: [], result: "홈 이동", apiIds: [], dbTableIds: [] }],
  }
}

describe("parseGeneratedDesign", () => {
  it("정상 JSON을 그래프로 파싱한다", () => {
    const r = parseGeneratedDesign(JSON.stringify(coherent()))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.features[0].id).toBe("feat-1")
  })

  it("```json 펜스/프로즈로 감싸도 추출한다", () => {
    const wrapped = "여기 그래프예요:\n```json\n" + JSON.stringify(coherent()) + "\n```\n끝"
    expect(parseGeneratedDesign(wrapped).ok).toBe(true)
  })

  it("JSON이 아니면 invalid_json", () => {
    expect(parseGeneratedDesign("미안하지만 못 만들겠어요")).toEqual({ ok: false, error: "invalid_json" })
  })

  it("shape가 깨지면 검증 오류를 전달한다", () => {
    expect(parseGeneratedDesign(JSON.stringify({ requirements: [] }))).toEqual({ ok: false, error: "invalid_design_shape" })
  })

  it("내부 끊어진 참조(feature→없는 page)는 incoherent_graph", () => {
    const d = coherent()
    d.features[0].pageIds = ["page-404"]
    expect(parseGeneratedDesign(JSON.stringify(d))).toEqual({ ok: false, error: "incoherent_graph" })
  })

  it("코드-진실 참조 환각은 제거하고 통과시킨다", () => {
    const d = coherent()
    d.elements[0].apiIds = ["api-real", "api-hallucinated"]
    d.elements[0].dbTableIds = ["db-ghost"]
    d.features[0].apiIds = ["api-real"]
    const r = parseGeneratedDesign(JSON.stringify(d), { apiIds: new Set(["api-real"]), dbTableIds: new Set() })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.elements[0].apiIds).toEqual(["api-real"])
      expect(r.value.elements[0].dbTableIds).toEqual([])
      expect(r.value.features[0].apiIds).toEqual(["api-real"])
    }
  })

  it("코드-진실 미제공이면 모든 api/db 참조를 제거한다", () => {
    const d = coherent()
    d.elements[0].apiIds = ["api-x"]
    const r = parseGeneratedDesign(JSON.stringify(d))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.elements[0].apiIds).toEqual([])
  })

  it("같은 컬렉션 중복 id는 duplicate_design_id로 거부한다 (ASM-022)", () => {
    // files 생성 경로(POST /api/products/[id]/files → runGenerate)가 저장 전 의존하는 경계.
    // parseDesign(validate.ts collectionError)을 경유하는 계약이 깨지면 중복 id 디자인이
    // updateDesign까지 흘러 저장된다 — 이 테스트가 그 회귀를 잡는다.
    const d = coherent()
    d.pages = [...d.pages, { id: "page-1", name: "중복", description: "", wireframeId: null }]
    expect(parseGeneratedDesign(JSON.stringify(d))).toEqual({ ok: false, error: "duplicate_design_id" })
  })

  it("중복 id 거부는 모든 컬렉션에 적용된다 (ASM-022)", () => {
    const d = coherent()
    d.elements = [...d.elements, { ...d.elements[0] }]
    d.wireframes[0].elementIds = ["el-1"]
    expect(parseGeneratedDesign(JSON.stringify(d))).toEqual({ ok: false, error: "duplicate_design_id" })
  })

  it("id만 있고 배열 필드를 빠뜨린 항목도 던지지 않고 정규화한다", () => {
    // 모델이 valid JSON을 주되 apiIds/pageIds/elementIds 등을 누락한 경우 —
    // 예전엔 sanitize/findDanglingRefs 가 undefined.filter 로 던져 500 이 났다.
    const partial = {
      requirements: [{ id: "req-1" }],
      features: [{ id: "feat-1", requirementIds: ["req-1"] }],
      pages: [{ id: "page-1" }],
      flows: [{ id: "flow-1" }],
      wireframes: [{ id: "wf-1" }],
      elements: [{ id: "el-1" }],
    }
    const r = parseGeneratedDesign(JSON.stringify(partial))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.features[0].pageIds).toEqual([])
      expect(r.value.features[0].apiIds).toEqual([])
      expect(r.value.elements[0].apiIds).toEqual([])
      expect(r.value.wireframes[0].elementIds).toEqual([])
      expect(r.value.flows[0].edges).toEqual([])
    }
  })
})

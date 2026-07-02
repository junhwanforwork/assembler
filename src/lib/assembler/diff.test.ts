import { describe, expect, it } from "vitest"
import type { Feature, Flow, Page, Requirement, UIElement, WorkspaceDesign, Wireframe } from "@/lib/types/assembler"
import { createEmptyDesign } from "@/lib/types/design"
import { diffDesign } from "./diff"

// ─────────────── 픽스처 빌더 ───────────────

function requirement(id: string, patch: Partial<Requirement> = {}): Requirement {
  return {
    id,
    title: `req ${id}`,
    description: "",
    status: "draft",
    priority: "medium",
    role: "user",
    acceptanceCriteria: [],
    ...patch,
  }
}

function feature(id: string, patch: Partial<Feature> = {}): Feature {
  return {
    id,
    name: `feature ${id}`,
    description: "",
    detailFeatures: [],
    requirementIds: [],
    pageIds: [],
    apiIds: [],
    ...patch,
  }
}

function page(id: string, patch: Partial<Page> = {}): Page {
  return { id, name: `page ${id}`, description: "", wireframeId: null, ...patch }
}

function flow(id: string, patch: Partial<Flow> = {}): Flow {
  return { id, name: `flow ${id}`, edges: [], ...patch }
}

function wireframe(id: string, patch: Partial<Wireframe> = {}): Wireframe {
  return { id, elementIds: [], ...patch }
}

function element(id: string, patch: Partial<UIElement> = {}): UIElement {
  return {
    id,
    label: `element ${id}`,
    type: "button",
    action: "Click",
    states: [],
    result: "none",
    apiIds: [],
    dbTableIds: [],
    ...patch,
  }
}

function design(patch: Partial<WorkspaceDesign> = {}): WorkspaceDesign {
  return { ...createEmptyDesign(), ...patch }
}

const EMPTY_COLLECTION = { added: [], removed: [], modified: [] }

// ─────────────── 무변경 ───────────────

describe("diffDesign — 무변경", () => {
  it("동일 디자인이면 모든 컬렉션 델타·연결 델타가 빈다", () => {
    const d = design({
      requirements: [requirement("r1")],
      features: [feature("f1", { requirementIds: ["r1"], pageIds: ["p1"] })],
      pages: [page("p1", { wireframeId: "w1" })],
      flows: [flow("fl1", { edges: [{ id: "e1", fromPageId: "p1", toPageId: "p1", trigger: "클릭" }] })],
      wireframes: [wireframe("w1", { elementIds: ["el1"] })],
      elements: [element("el1", { apiIds: ["api1"] })],
    })
    const delta = diffDesign(d, structuredClone(d))
    expect(delta.collections).toEqual({
      requirements: EMPTY_COLLECTION,
      features: EMPTY_COLLECTION,
      pages: EMPTY_COLLECTION,
      flows: EMPTY_COLLECTION,
      wireframes: EMPTY_COLLECTION,
      elements: EMPTY_COLLECTION,
    })
    expect(delta.links).toEqual([])
  })

  it("키 순서만 다른 동등 객체는 수정으로 치지 않는다", () => {
    const oldDesign = design({ pages: [{ id: "p1", name: "홈", description: "", wireframeId: null }] })
    const newDesign = design({ pages: [{ wireframeId: null, description: "", name: "홈", id: "p1" }] })
    expect(diffDesign(oldDesign, newDesign).collections.pages).toEqual(EMPTY_COLLECTION)
  })
})

// ─────────────── 추가 / 삭제 / 수정 ───────────────

describe("diffDesign — 컬렉션별 추가/삭제/수정", () => {
  it("새 id는 added, 사라진 id는 removed로 잡는다", () => {
    const oldDesign = design({ pages: [page("p1"), page("p2")] })
    const newDesign = design({ pages: [page("p2"), page("p3")] })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.collections.pages).toEqual({ added: ["p3"], removed: ["p1"], modified: [] })
  })

  it("같은 id의 내용 변경은 modified로 잡는다", () => {
    const oldDesign = design({ requirements: [requirement("r1", { title: "가입" })] })
    const newDesign = design({ requirements: [requirement("r1", { title: "가입·탈퇴" })] })
    expect(diffDesign(oldDesign, newDesign).collections.requirements).toEqual({
      added: [],
      removed: [],
      modified: ["r1"],
    })
  })

  it("중첩 필드(states·detailFeatures) 변경도 modified로 잡는다", () => {
    const oldDesign = design({ elements: [element("el1", { states: [{ name: "Default", description: "" }] })] })
    const newDesign = design({
      elements: [element("el1", { states: [{ name: "Default", description: "" }, { name: "Loading", description: "저장 중" }] })],
    })
    expect(diffDesign(oldDesign, newDesign).collections.elements.modified).toEqual(["el1"])
  })

  it("여섯 컬렉션이 독립적으로 diff된다", () => {
    const oldDesign = design({
      requirements: [requirement("r1")],
      features: [feature("f1")],
      pages: [page("p1")],
      flows: [flow("fl1")],
      wireframes: [wireframe("w1")],
      elements: [element("el1")],
    })
    const newDesign = design({
      requirements: [requirement("r1")],
      features: [feature("f1", { name: "개명" })],
      pages: [page("p1"), page("p2")],
      flows: [],
      wireframes: [wireframe("w1")],
      elements: [element("el2")],
    })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.collections.requirements).toEqual(EMPTY_COLLECTION)
    expect(delta.collections.features.modified).toEqual(["f1"])
    expect(delta.collections.pages.added).toEqual(["p2"])
    expect(delta.collections.flows.removed).toEqual(["fl1"])
    expect(delta.collections.wireframes).toEqual(EMPTY_COLLECTION)
    expect(delta.collections.elements).toEqual({ added: ["el2"], removed: ["el1"], modified: [] })
  })
})

// ─────────────── 연결(참조 배열) 변경 ───────────────

describe("diffDesign — 연결 변경", () => {
  it("feature의 requirementIds·pageIds·apiIds 변경을 연결 델타로 추출한다", () => {
    const oldDesign = design({
      features: [feature("f1", { requirementIds: ["r1"], pageIds: ["p1", "p2"], apiIds: ["api1"] })],
    })
    const newDesign = design({
      features: [feature("f1", { requirementIds: ["r1", "r2"], pageIds: ["p2"], apiIds: ["api1"] })],
    })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.links).toEqual([
      { from: "feature:f1", field: "requirementIds", added: ["r2"], removed: [] },
      { from: "feature:f1", field: "pageIds", added: [], removed: ["p1"] },
    ])
    expect(delta.collections.features.modified).toEqual(["f1"])
  })

  it("element의 apiIds·dbTableIds 변경을 연결 델타로 추출한다", () => {
    const oldDesign = design({ elements: [element("el1", { apiIds: ["api1"], dbTableIds: [] })] })
    const newDesign = design({ elements: [element("el1", { apiIds: [], dbTableIds: ["t1"] })] })
    expect(diffDesign(oldDesign, newDesign).links).toEqual([
      { from: "element:el1", field: "apiIds", added: [], removed: ["api1"] },
      { from: "element:el1", field: "dbTableIds", added: ["t1"], removed: [] },
    ])
  })

  it("wireframe의 elementIds 변경을 연결 델타로 추출한다", () => {
    const oldDesign = design({ wireframes: [wireframe("w1", { elementIds: ["el1"] })] })
    const newDesign = design({ wireframes: [wireframe("w1", { elementIds: ["el1", "el2"] })] })
    expect(diffDesign(oldDesign, newDesign).links).toEqual([
      { from: "wireframe:w1", field: "elementIds", added: ["el2"], removed: [] },
    ])
  })

  it("page의 wireframeId(스칼라 참조) 교체·해제를 연결 델타로 추출한다", () => {
    const oldDesign = design({ pages: [page("p1", { wireframeId: "w1" }), page("p2", { wireframeId: "w2" })] })
    const newDesign = design({ pages: [page("p1", { wireframeId: "w9" }), page("p2", { wireframeId: null })] })
    expect(diffDesign(oldDesign, newDesign).links).toEqual([
      { from: "page:p1", field: "wireframeId", added: ["w9"], removed: ["w1"] },
      { from: "page:p2", field: "wireframeId", added: [], removed: ["w2"] },
    ])
  })

  it("flow edge 추가·삭제·목적지 변경을 페이지쌍 디스크립터로 추출한다", () => {
    const oldDesign = design({
      flows: [
        flow("fl1", {
          edges: [
            { id: "e1", fromPageId: "p1", toPageId: "p2", trigger: "로그인 성공 시" },
            { id: "e2", fromPageId: "p2", toPageId: "p3", trigger: "다음" },
          ],
        }),
      ],
    })
    const newDesign = design({
      flows: [
        flow("fl1", {
          edges: [
            { id: "e1", fromPageId: "p1", toPageId: "p2", trigger: "로그인 성공 시" },
            { id: "e2", fromPageId: "p2", toPageId: "p4", trigger: "다음" },
            { id: "e3", fromPageId: "p4", toPageId: "p1", trigger: "홈으로" },
          ],
        }),
      ],
    })
    expect(diffDesign(oldDesign, newDesign).links).toEqual([
      { from: "flow:fl1", field: "edges", added: ["p2->p4", "p4->p1"], removed: ["p2->p3"] },
    ])
  })

  it("trigger 문구만 바뀐 edge는 flow modified일 뿐 연결 델타가 아니다", () => {
    const oldDesign = design({
      flows: [flow("fl1", { edges: [{ id: "e1", fromPageId: "p1", toPageId: "p2", trigger: "저장 시" }] })],
    })
    const newDesign = design({
      flows: [flow("fl1", { edges: [{ id: "e1", fromPageId: "p1", toPageId: "p2", trigger: "저장 성공 시" }] })],
    })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.collections.flows.modified).toEqual(["fl1"])
    expect(delta.links).toEqual([])
  })

  it("참조 배열의 순서만 바뀌면 modified로 잡되 연결 델타는 내지 않는다", () => {
    const oldDesign = design({ features: [feature("f1", { pageIds: ["p1", "p2"] })] })
    const newDesign = design({ features: [feature("f1", { pageIds: ["p2", "p1"] })] })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.collections.features.modified).toEqual(["f1"])
    expect(delta.links).toEqual([])
  })

  it("추가·삭제된 객체의 연결은 links로 중복 추출하지 않는다(객체 델타가 이미 담는다)", () => {
    const oldDesign = design({ features: [feature("f1", { apiIds: ["api1"] })] })
    const newDesign = design({ features: [feature("f2", { apiIds: ["api2"] })] })
    const delta = diffDesign(oldDesign, newDesign)
    expect(delta.collections.features).toEqual({ added: ["f2"], removed: ["f1"], modified: [] })
    expect(delta.links).toEqual([])
  })
})

// ─────────────── 대형 케이스 ───────────────

describe("diffDesign — 대형 케이스(컬렉션 캡 300)", () => {
  it("300개 컬렉션에서 정확한 델타를 낸다", () => {
    const oldPages = Array.from({ length: 300 }, (_, i) => page(`p${i}`))
    // p0~149 유지(그중 p0~9 수정), p150~299 삭제, p300~449 추가
    const kept = oldPages.slice(0, 150).map((p, i) => (i < 10 ? { ...p, name: `${p.name} v2` } : p))
    const added = Array.from({ length: 150 }, (_, i) => page(`p${300 + i}`))
    const oldDesign = design({ pages: oldPages })
    const newDesign = design({ pages: [...kept, ...added] })

    const start = performance.now()
    const delta = diffDesign(oldDesign, newDesign)
    const elapsed = performance.now() - start

    expect(delta.collections.pages.added).toHaveLength(150)
    expect(delta.collections.pages.removed).toHaveLength(150)
    expect(delta.collections.pages.modified).toEqual(Array.from({ length: 10 }, (_, i) => `p${i}`))
    // O(n) 비교면 수백 ms도 안 걸린다 — 회귀(중첩 루프 O(n²) 등) 감지용 여유 상한.
    expect(elapsed).toBeLessThan(500)
  })
})

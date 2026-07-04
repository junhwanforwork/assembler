import { describe, expect, it } from "vitest"
import type { Feature, Flow, Page, Requirement, UIElement, WorkspaceDesign, Wireframe } from "@/lib/types/assembler"
import { createEmptyDesign } from "@/lib/types/design"
import { buildImpactIndex, collectImpact, type ImpactRef } from "./impact"

// ─────────────── 픽스처 빌더 (diff.test.ts와 동일 스타일) ───────────────

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

function impacted(design: WorkspaceDesign, seeds: ImpactRef[]): ImpactRef[] {
  return collectImpact(buildImpactIndex(design), seeds)
}

// ─────────────── 직접 역참조 (1단계) ───────────────

describe("collectImpact — 직접 역참조", () => {
  it("요구사항 변경 → 그 요구사항을 참조하는 기능만 잡는다", () => {
    const d = design({
      requirements: [requirement("r1"), requirement("r2")],
      features: [
        feature("f1", { requirementIds: ["r1"] }),
        feature("f2", { requirementIds: ["r2"] }),
        feature("f3", { requirementIds: ["r1", "r2"] }),
      ],
    })
    expect(impacted(d, [{ collection: "requirements", id: "r1" }])).toEqual([
      { collection: "features", id: "f1" },
      { collection: "features", id: "f3" },
    ])
  })

  it("페이지 변경 → 참조하는 기능 + 그 페이지를 지나는 플로우를 잡는다", () => {
    const d = design({
      features: [feature("f1", { pageIds: ["p1"] }), feature("f2", { pageIds: ["p2"] })],
      pages: [page("p1"), page("p2"), page("p3")],
      flows: [
        flow("fl1", { edges: [{ id: "e1", fromPageId: "p1", toPageId: "p3", trigger: "클릭" }] }),
        flow("fl2", { edges: [{ id: "e2", fromPageId: "p3", toPageId: "p1", trigger: "제출" }] }),
        flow("fl3", { edges: [{ id: "e3", fromPageId: "p2", toPageId: "p3", trigger: "이동" }] }),
      ],
    })
    const result = impacted(d, [{ collection: "pages", id: "p1" }])
    expect(result).toContainEqual({ collection: "features", id: "f1" })
    // from·to 어느 쪽이든 걸린다
    expect(result).toContainEqual({ collection: "flows", id: "fl1" })
    expect(result).toContainEqual({ collection: "flows", id: "fl2" })
    expect(result).not.toContainEqual({ collection: "features", id: "f2" })
    expect(result).not.toContainEqual({ collection: "flows", id: "fl3" })
  })

  it("와이어프레임 변경 → 소유 페이지, 요소 변경 → 담고 있는 와이어프레임을 잡는다", () => {
    const d = design({
      pages: [page("p1", { wireframeId: "w1" }), page("p2", { wireframeId: "w2" })],
      wireframes: [wireframe("w1", { elementIds: ["el1"] }), wireframe("w2", { elementIds: ["el2"] })],
      elements: [element("el1"), element("el2")],
    })
    expect(impacted(d, [{ collection: "wireframes", id: "w1" }])).toContainEqual({ collection: "pages", id: "p1" })
    expect(impacted(d, [{ collection: "elements", id: "el2" }])).toContainEqual({ collection: "wireframes", id: "w2" })
  })
})

// ─────────────── 전이 (다단계) ───────────────

describe("collectImpact — 전이 전파", () => {
  it("요소 변경이 와이어프레임→페이지→기능·플로우까지 전파된다", () => {
    const d = design({
      requirements: [requirement("r1")],
      features: [feature("f1", { requirementIds: ["r1"], pageIds: ["p1"] })],
      pages: [page("p1", { wireframeId: "w1" })],
      flows: [flow("fl1", { edges: [{ id: "e1", fromPageId: "p1", toPageId: "p1", trigger: "클릭" }] })],
      wireframes: [wireframe("w1", { elementIds: ["el1"] })],
      elements: [element("el1")],
    })
    expect(impacted(d, [{ collection: "elements", id: "el1" }])).toEqual([
      { collection: "wireframes", id: "w1" },
      { collection: "pages", id: "p1" },
      { collection: "features", id: "f1" },
      { collection: "flows", id: "fl1" },
    ])
  })

  it("기능·플로우는 종단 — 아무것도 참조하지 않으므로 영향이 비어 있다", () => {
    const d = design({
      requirements: [requirement("r1")],
      features: [feature("f1", { requirementIds: ["r1"] })],
      flows: [flow("fl1")],
    })
    expect(impacted(d, [{ collection: "features", id: "f1" }])).toEqual([])
    expect(impacted(d, [{ collection: "flows", id: "fl1" }])).toEqual([])
  })
})

// ─────────────── 가드 (중복·순환·소실) ───────────────

describe("collectImpact — 방문 가드", () => {
  it("시드 자신은 결과에 넣지 않고, 여러 시드가 같은 객체로 수렴해도 한 번만 낸다", () => {
    const d = design({
      pages: [page("p1", { wireframeId: "w1" })],
      wireframes: [wireframe("w1", { elementIds: ["el1", "el2"] })],
      elements: [element("el1"), element("el2")],
    })
    const result = impacted(d, [
      { collection: "elements", id: "el1" },
      { collection: "elements", id: "el2" },
      { collection: "elements", id: "el1" },
    ])
    expect(result).toEqual([
      { collection: "wireframes", id: "w1" },
      { collection: "pages", id: "p1" },
    ])
  })

  it("같은 참조가 배열에 중복돼 있어도(병렬 edge 등) 영향은 한 번만 낸다", () => {
    const d = design({
      features: [feature("f1", { pageIds: ["p1", "p1"] })],
      pages: [page("p1")],
      flows: [
        flow("fl1", {
          edges: [
            { id: "e1", fromPageId: "p1", toPageId: "p1", trigger: "a" },
            { id: "e2", fromPageId: "p1", toPageId: "p1", trigger: "b" },
          ],
        }),
      ],
    })
    expect(impacted(d, [{ collection: "pages", id: "p1" }])).toEqual([
      { collection: "features", id: "f1" },
      { collection: "flows", id: "fl1" },
    ])
  })

  it("시드가 하위 전파 경로에 다시 나타나도(순환 가드) 무한 순회하지 않는다", () => {
    // 스키마상 순환은 불가하지만 워커는 데이터 손상을 가정하고 방어한다 —
    // 페이지 둘이 같은 와이어프레임을 가리키는 손상 데이터로 재방문 경로를 만든다.
    const d = design({
      features: [feature("f1", { pageIds: ["p1", "p2"] })],
      pages: [page("p1", { wireframeId: "w1" }), page("p2", { wireframeId: "w1" })],
      wireframes: [wireframe("w1", { elementIds: ["el1"] })],
      elements: [element("el1")],
    })
    const result = impacted(d, [{ collection: "elements", id: "el1" }])
    expect(result).toEqual([
      { collection: "wireframes", id: "w1" },
      { collection: "pages", id: "p1" },
      { collection: "pages", id: "p2" },
      { collection: "features", id: "f1" },
    ])
  })

  it("그래프에 없는 id(add op·소실 대상)는 영향이 비어 있다", () => {
    const d = design({
      requirements: [requirement("r1")],
      features: [feature("f1", { requirementIds: ["r1"] })],
    })
    expect(impacted(d, [{ collection: "requirements", id: "ghost" }])).toEqual([])
  })

  it("빈 디자인·빈 시드는 빈 결과를 낸다", () => {
    expect(impacted(createEmptyDesign(), [{ collection: "pages", id: "p1" }])).toEqual([])
    expect(impacted(design({ pages: [page("p1")] }), [])).toEqual([])
  })
})

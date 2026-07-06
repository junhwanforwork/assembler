import { describe, expect, it } from "vitest"
import type { Api, DbTable, Feature, Page, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { projectTechSpec, techAnchorId, TECH_UNLINKED_ANCHOR_ID } from "./techSpecProjection"

function req(id: string, over: Partial<Requirement> = {}): Requirement {
  return {
    id,
    title: `요구 ${id}`,
    description: `설명 ${id}`,
    status: "draft",
    priority: "medium",
    role: "사용자",
    acceptanceCriteria: [],
    ...over,
  }
}

function feat(id: string, over: Partial<Feature> = {}): Feature {
  return {
    id,
    name: `기능 ${id}`,
    description: `기능 설명 ${id}`,
    detailFeatures: [],
    requirementIds: [],
    pageIds: [],
    apiIds: [],
    ...over,
  }
}

function page(id: string): Page {
  return { id, name: `페이지 ${id}`, description: "", wireframeId: null }
}

function api(id: string, over: Partial<Api> = {}): Api {
  return {
    id,
    productId: "p1",
    method: "GET",
    endpoint: `/api/${id}`,
    summary: `요약 ${id}`,
    status: "active",
    source: "code",
    ...over,
  }
}

function table(id: string, name = `tbl_${id}`): DbTable {
  return { id, productId: "p1", name, description: `테이블 ${id}`, columns: [], source: "code" }
}

function design(over: Partial<WorkspaceDesign> = {}): WorkspaceDesign {
  return { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [], ...over }
}

// dbTableIds는 레인 1이 병행 신설 중 — 타입에 아직 없어도 옵셔널로 읽는다(머지 후 자동 활성).
function featWithTables(id: string, dbTableIds: string[], over: Partial<Feature> = {}): Feature {
  return { ...feat(id, over), dbTableIds } as Feature
}

describe("projectTechSpec", () => {
  it("섹션은 기능 순서를 그대로 따르고 기능의 이름·설명을 담는다", () => {
    const d = design({ features: [feat("f2", { apiIds: ["a1"] }), feat("f1", { apiIds: ["a1"] })] })
    const { sections } = projectTechSpec(d, [api("a1")], [])
    expect(sections.map((sec) => sec.feature.id)).toEqual(["f2", "f1"])
    expect(sections[0].feature.name).toBe("기능 f2")
    expect(sections[0].feature.description).toBe("기능 설명 f2")
  })

  it("연결 요구사항(의도)은 requirementIds로 해석되고 dangling id는 무시된다", () => {
    const d = design({
      requirements: [req("r1"), req("r2")],
      features: [feat("f1", { requirementIds: ["r2", "r-없음", "r1"], apiIds: ["a1"] })],
    })
    const { sections } = projectTechSpec(d, [api("a1")], [])
    expect(sections[0].requirements.map((r) => r.id)).toEqual(["r2", "r1"])
    expect(sections[0].requirements[0].title).toBe("요구 r2")
  })

  it("연결 페이지는 pageIds로 해석되고 dangling id는 무시된다", () => {
    const d = design({
      pages: [page("p1")],
      features: [feat("f1", { pageIds: ["p1", "p-없음"], apiIds: ["a1"] })],
    })
    const { sections } = projectTechSpec(d, [api("a1")], [])
    expect(sections[0].pages).toEqual([{ id: "p1", name: "페이지 p1" }])
  })

  it("연결 API는 메서드·엔드포인트·상태·요약을 담고 dangling id는 무시된다", () => {
    const d = design({ features: [feat("f1", { apiIds: ["a1", "a-없음"] })] })
    const a = api("a1", { method: "POST", endpoint: "/api/walks", status: "planned", summary: "산책 기록" })
    const { sections } = projectTechSpec(d, [a], [])
    expect(sections[0].apis).toEqual([
      { id: "a1", method: "POST", endpoint: "/api/walks", status: "planned", summary: "산책 기록" },
    ])
  })

  it("feature.dbTableIds가 있으면 연결 DB 테이블을 해석한다 (dangling 무시)", () => {
    const d = design({ features: [featWithTables("f1", ["t1", "t-없음"])] })
    const { sections } = projectTechSpec(d, [], [table("t1", "walks")])
    expect(sections[0].dbTables).toEqual([{ id: "t1", name: "walks", description: "테이블 t1" }])
  })

  it("feature.dbTableIds가 없으면(필드 부재) DB 테이블은 빈 배열로 생략된다", () => {
    const d = design({ features: [feat("f1", { apiIds: ["a1"] })] })
    const { sections } = projectTechSpec(d, [api("a1")], [table("t1")])
    expect(sections[0].dbTables).toEqual([])
  })

  it("API·DB 연결이 하나도 없는 기능은 버리지 않고 unlinked 말미 섹션으로 모은다", () => {
    const d = design({
      requirements: [req("r1")],
      features: [feat("f1", { apiIds: ["a1"] }), feat("f2", { requirementIds: ["r1"] })],
    })
    const { sections, unlinkedFeatures } = projectTechSpec(d, [api("a1")], [])
    expect(sections.map((sec) => sec.feature.id)).toEqual(["f1"])
    expect(unlinkedFeatures.map((f) => f.id)).toEqual(["f2"])
  })

  it("apiIds가 전부 dangling이면 unlinked로 분류된다 (유령 연결로 섹션 승격 금지)", () => {
    const d = design({ features: [feat("f1", { apiIds: ["a-없음"] })] })
    const { sections, unlinkedFeatures } = projectTechSpec(d, [], [])
    expect(sections).toHaveLength(0)
    expect(unlinkedFeatures.map((f) => f.id)).toEqual(["f1"])
  })

  it("유효한 DB 연결만 있어도 섹션으로 승격된다", () => {
    const d = design({ features: [featWithTables("f1", ["t1"])] })
    const { sections, unlinkedFeatures } = projectTechSpec(d, [], [table("t1")])
    expect(sections.map((sec) => sec.feature.id)).toEqual(["f1"])
    expect(unlinkedFeatures).toHaveLength(0)
  })

  it("TOC는 섹션당 1엔트리 + unlinked가 있으면 말미 1엔트리", () => {
    const d = design({ features: [feat("f1", { apiIds: ["a1"] }), feat("f2")] })
    const { toc } = projectTechSpec(d, [api("a1")], [])
    expect(toc.map((t) => t.anchorId)).toEqual([techAnchorId("f1"), TECH_UNLINKED_ANCHOR_ID])
    expect(toc[0].title).toBe("기능 f1")
  })

  it("unlinked가 없으면 TOC에 말미 엔트리도 없다", () => {
    const d = design({ features: [feat("f1", { apiIds: ["a1"] })] })
    const { toc } = projectTechSpec(d, [api("a1")], [])
    expect(toc.map((t) => t.anchorId)).toEqual([techAnchorId("f1")])
  })

  it("isEmpty는 기능이 하나도 없을 때만 참이다 (빈 모델 방어)", () => {
    expect(projectTechSpec(design(), [], []).isEmpty).toBe(true)
    expect(projectTechSpec(design({ features: [feat("f1")] }), [], []).isEmpty).toBe(false)
  })

  it("anchorId는 기능 id로 결정적으로 만들어진다", () => {
    expect(techAnchorId("f1")).toBe(techAnchorId("f1"))
    expect(techAnchorId("f1")).not.toBe(techAnchorId("f2"))
    expect(techAnchorId("f1")).not.toBe(TECH_UNLINKED_ANCHOR_ID)
  })
})

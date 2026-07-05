import { describe, expect, it } from "vitest"
import type { Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { docAnchorId, projectDoc, UNLINKED_ANCHOR_ID } from "./docProjection"

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

function feat(id: string, requirementIds: string[], over: Partial<Feature> = {}): Feature {
  return {
    id,
    name: `기능 ${id}`,
    description: `기능 설명 ${id}`,
    detailFeatures: [],
    requirementIds,
    pageIds: [],
    apiIds: [],
    ...over,
  }
}

function design(requirements: Requirement[], features: Feature[]): WorkspaceDesign {
  return { requirements, features, pages: [], flows: [], wireframes: [], elements: [] }
}

describe("projectDoc", () => {
  it("섹션은 요구사항 순서를 그대로 따르고 요구사항 원본을 담는다", () => {
    const r1 = req("r1", { status: "approved", priority: "high", acceptanceCriteria: ["A", "B"] })
    const r2 = req("r2")
    const { sections } = projectDoc(design([r1, r2], []))
    expect(sections.map((sec) => sec.requirement.id)).toEqual(["r1", "r2"])
    expect(sections[0].requirement.acceptanceCriteria).toEqual(["A", "B"])
  })

  it("연결 기능은 requirementIds 역참조로 붙고 features 원본 순서를 유지한다", () => {
    const d = design(
      [req("r1")],
      [feat("f2", ["r1"]), feat("f1", ["r1"]), feat("fx", ["r-없음"])],
    )
    const { sections } = projectDoc(d)
    expect(sections[0].features.map((f) => f.id)).toEqual(["f2", "f1"])
  })

  it("한 기능이 여러 요구사항에 연결되면 각 섹션에 모두 나타난다 (N:N)", () => {
    const d = design([req("r1"), req("r2")], [feat("f1", ["r1", "r2"])])
    const { sections } = projectDoc(d)
    expect(sections[0].features.map((f) => f.id)).toEqual(["f1"])
    expect(sections[1].features.map((f) => f.id)).toEqual(["f1"])
  })

  it("detailFeatures가 기능 블록에 그대로 실린다", () => {
    const d = design(
      [req("r1")],
      [feat("f1", ["r1"], { detailFeatures: [{ id: "d1", title: "세부", description: "내용" }] })],
    )
    expect(projectDoc(d).sections[0].features[0].detailFeatures).toEqual([
      { id: "d1", title: "세부", description: "내용" },
    ])
  })

  it("유효한 요구사항 연결이 없는 기능은 버리지 않고 unlinkedFeatures로 모은다", () => {
    const d = design(
      [req("r1")],
      [feat("f1", ["r1"]), feat("f2", []), feat("f3", ["r-dangling"])],
    )
    const { sections, unlinkedFeatures } = projectDoc(d)
    expect(sections[0].features.map((f) => f.id)).toEqual(["f1"])
    expect(unlinkedFeatures.map((f) => f.id)).toEqual(["f2", "f3"])
  })

  it("일부만 dangling인 기능은 유효한 섹션에 정상 연결된다 (unlinked 아님)", () => {
    const d = design([req("r1")], [feat("f1", ["r-dangling", "r1"])])
    const { sections, unlinkedFeatures } = projectDoc(d)
    expect(sections[0].features.map((f) => f.id)).toEqual(["f1"])
    expect(unlinkedFeatures).toHaveLength(0)
  })

  it("dangling 참조가 유령 섹션을 만들지 않는다", () => {
    const d = design([req("r1")], [feat("f1", ["r-dangling", "r1"])])
    expect(projectDoc(d).sections.map((sec) => sec.requirement.id)).toEqual(["r1"])
  })

  it("TOC는 섹션당 1엔트리 + unlinked가 있으면 말미 1엔트리", () => {
    const d = design([req("r1"), req("r2")], [feat("f1", [])])
    const { toc } = projectDoc(d)
    expect(toc.map((t) => t.anchorId)).toEqual([docAnchorId("r1"), docAnchorId("r2"), UNLINKED_ANCHOR_ID])
    expect(toc[0].title).toBe("요구 r1")
  })

  it("unlinked가 없으면 TOC에 말미 엔트리도 없다", () => {
    const d = design([req("r1")], [feat("f1", ["r1"])])
    expect(projectDoc(d).toc.map((t) => t.anchorId)).toEqual([docAnchorId("r1")])
  })

  it("isEmpty는 요구사항·기능이 모두 없을 때만 참이다", () => {
    expect(projectDoc(design([], [])).isEmpty).toBe(true)
    expect(projectDoc(design([req("r1")], [])).isEmpty).toBe(false)
    expect(projectDoc(design([], [feat("f1", [])])).isEmpty).toBe(false)
  })

  it("요구사항 0건이어도 기능이 있으면 unlinked 섹션으로 표시된다 (거짓 빈 상태 금지)", () => {
    const p = projectDoc(design([], [feat("f1", [])]))
    expect(p.sections).toHaveLength(0)
    expect(p.unlinkedFeatures.map((f) => f.id)).toEqual(["f1"])
    expect(p.isEmpty).toBe(false)
  })

  it("anchorId는 요구사항 id로 결정적으로 만들어진다", () => {
    expect(docAnchorId("r1")).toBe(docAnchorId("r1"))
    expect(docAnchorId("r1")).not.toBe(docAnchorId("r2"))
    expect(docAnchorId("r1")).not.toBe(UNLINKED_ANCHOR_ID)
  })
})

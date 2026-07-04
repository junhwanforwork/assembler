import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { createEmptyDesign } from "@/lib/types/design"
import { buildImpactRows } from "./planImpact"

// 도크 "영향 범위" 행 빌더 — op별 직접 대상 + 전이 영향을 타입 라벨·이름·점프 경로 칩으로.

function op(patch: Partial<ChangeOp> & Pick<ChangeOp, "collection" | "targetId">): ChangeOp {
  return { id: `op-${patch.targetId}`, action: "update", summary: "", payload: null, ...patch }
}

function fixtureDesign(): WorkspaceDesign {
  return {
    ...createEmptyDesign(),
    requirements: [
      {
        id: "r1",
        title: "가입할 수 있어야 한다",
        description: "",
        status: "draft",
        priority: "medium",
        role: "user",
        acceptanceCriteria: [],
      },
    ],
    features: [
      {
        id: "f1",
        name: "회원가입",
        description: "",
        detailFeatures: [],
        requirementIds: ["r1"],
        pageIds: ["p1"],
        apiIds: [],
      },
    ],
    pages: [{ id: "p1", name: "가입 페이지", description: "", wireframeId: "w1" }],
    flows: [{ id: "fl1", name: "가입 플로우", edges: [{ id: "e1", fromPageId: "p1", toPageId: "p1", trigger: "제출" }] }],
    wireframes: [{ id: "w1", elementIds: ["el1"] }],
    elements: [
      { id: "el1", label: "제출 버튼", type: "button", action: "Click", states: [], result: "none", apiIds: [], dbTableIds: [] },
    ],
  }
}

describe("buildImpactRows", () => {
  it("요소 op 하나가 와이어프레임→페이지→기능·플로우 칩 행으로 풀린다", () => {
    const rows = buildImpactRows([op({ collection: "elements", targetId: "el1" })], fixtureDesign())
    expect(rows).toHaveLength(1)
    expect(rows[0].opId).toBe("op-el1")
    expect(rows[0].target).toMatchObject({ kindLabel: "요소", name: "제출 버튼", jump: null })
    expect(rows[0].impacts.map((c) => [c.kindLabel, c.name])).toEqual([
      ["와이어프레임", "가입 페이지"],
      ["페이지", "가입 페이지"],
      ["기능", "회원가입"],
      ["플로우", "가입 플로우"],
    ])
  })

  it("요구사항·기능 칩만 명세 선택 점프 경로를 갖는다", () => {
    const rows = buildImpactRows([op({ collection: "requirements", targetId: "r1" })], fixtureDesign())
    expect(rows[0].target.jump).toEqual({ kind: "requirement", reqId: "r1" })
    const featureChip = rows[0].impacts.find((c) => c.kindLabel === "기능")
    expect(featureChip?.jump).toEqual({ kind: "feature", reqId: "r1", featureId: "f1" })
  })

  it("영향 0건인 op(add·종단·소실 대상)는 행을 만들지 않는다", () => {
    const rows = buildImpactRows(
      [
        op({ collection: "features", targetId: "f-new", action: "add", payload: { id: "f-new", name: "새 기능" } }),
        op({ collection: "flows", targetId: "fl1" }),
        op({ collection: "pages", targetId: "ghost", action: "remove" }),
      ],
      fixtureDesign(),
    )
    expect(rows).toEqual([])
  })

  it("이름을 찾을 수 없는 대상은 id로 표기한다(스테일 계획 방어)", () => {
    // 기능이 소실된 페이지를 참조하는 손상 상태 — 대상은 컬렉션에 없지만 역참조는 남아 있다.
    const d = fixtureDesign()
    d.pages = []
    const rows = buildImpactRows([op({ collection: "pages", targetId: "p1", action: "remove" })], d)
    expect(rows[0].target.name).toBe("p1")
  })
})

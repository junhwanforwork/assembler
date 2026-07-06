import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { DanglingRef } from "@/lib/types/design"
import { createEmptyDesign } from "@/lib/types/design"
import { danglingRefMessage, findItemByAnyId, resolveItemName } from "./designNames"

// ASM-047 — 도크 표시용 id→이름 해석 공용 유틸. 실패는 null로 돌려
// 호출부가 정직 폴백(raw id 노출 금지·개수 보존)을 고른다.

function design(): WorkspaceDesign {
  return {
    ...createEmptyDesign(),
    requirements: [
      {
        id: "req-1",
        title: "로그인",
        description: "",
        status: "draft",
        priority: "high",
        role: "회원",
        acceptanceCriteria: [],
      },
    ],
    features: [
      {
        id: "feat-1",
        name: "결제",
        description: "",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
      },
    ],
    pages: [{ id: "page-1", name: "홈", description: "", wireframeId: "wf-1" }],
    flows: [{ id: "flow-1", name: "구매 흐름", edges: [] }],
    wireframes: [{ id: "wf-1", elementIds: ["el-1"] }, { id: "wf-orphan", elementIds: [] }],
    elements: [
      {
        id: "el-1",
        label: "결제 버튼",
        type: "button",
        action: "Click",
        states: [],
        result: "toast",
        apiIds: [],
        dbTableIds: [],
      },
    ],
  }
}

describe("resolveItemName — 컬렉션별 id→이름", () => {
  it("각 컬렉션의 이름 필드를 해석한다", () => {
    const d = design()
    expect(resolveItemName(d, "requirements", "req-1")).toBe("로그인")
    expect(resolveItemName(d, "features", "feat-1")).toBe("결제")
    expect(resolveItemName(d, "pages", "page-1")).toBe("홈")
    expect(resolveItemName(d, "flows", "flow-1")).toBe("구매 흐름")
    expect(resolveItemName(d, "elements", "el-1")).toBe("결제 버튼")
  })

  it("와이어프레임은 이름이 없어 소유 페이지 이름으로 부른다", () => {
    expect(resolveItemName(design(), "wireframes", "wf-1")).toBe("홈")
  })

  it("해석 불가(dangling·orphan)는 null — 폴백 결정은 호출부 몫", () => {
    expect(resolveItemName(design(), "requirements", "ghost")).toBeNull()
    expect(resolveItemName(design(), "wireframes", "wf-orphan")).toBeNull()
  })
})

describe("findItemByAnyId — 컬렉션 미상 id 해석(dangling 참조 주체용)", () => {
  it("전 컬렉션에서 찾아 컬렉션과 이름을 준다", () => {
    expect(findItemByAnyId(design(), "feat-1")).toEqual({ collection: "features", name: "결제" })
    expect(findItemByAnyId(design(), "el-1")).toEqual({ collection: "elements", name: "결제 버튼" })
  })

  it("존재하지만 이름을 빌릴 곳이 없는 항목은 name null", () => {
    expect(findItemByAnyId(design(), "wf-orphan")).toEqual({ collection: "wireframes", name: null })
  })

  it("없는 id는 null", () => {
    expect(findItemByAnyId(design(), "ghost")).toBeNull()
  })
})

describe("danglingRefMessage — 끊어진 연결 해요체 카피(id 노출 금지)", () => {
  // ⚠ from 픽스처는 서버 findDanglingRefs 실제 산출 포맷(`kind:id`·`flow:id/edge:id`)이어야 한다 —
  // bare id로 조작하면 프로덕션에서 전면 무력화돼도 green이 나온다(크로스체크 HIGH 정정).
  it("참조 주체는 종류+이름, 없는 대상은 종류로 말한다", () => {
    const ref: DanglingRef = { from: "feature:feat-1", field: "requirementIds", missingId: "ghost", kind: "requirement" }
    expect(danglingRefMessage(design(), ref)).toBe("기능 '결제'에 연결된 요구사항을 찾을 수 없어요.")
  })

  it("받침 없는 종류는 '를'로 잇는다", () => {
    const ref: DanglingRef = { from: "element:el-1", field: "apiIds", missingId: "ghost", kind: "api" }
    expect(danglingRefMessage(design(), ref)).toBe("요소 '결제 버튼'에 연결된 API를 찾을 수 없어요.")
  })

  it("flow edge 참조는 플로우 이름으로 부른다(flow:id/edge:id 포맷)", () => {
    const ref: DanglingRef = { from: "flow:flow-1/edge:edge-1", field: "toPageId", missingId: "gone", kind: "flowPage" }
    expect(danglingRefMessage(design(), ref)).toBe("플로우 '구매 흐름'에 연결된 페이지를 찾을 수 없어요.")
  })

  it("접두사는 있는데 항목이 로컬에 없으면 종류로 정직 폴백", () => {
    const ref: DanglingRef = { from: "page:ghost", field: "wireframeId", missingId: "gone", kind: "wireframe" }
    expect(danglingRefMessage(design(), ref)).toBe("이름 없는 페이지에 연결된 와이어프레임을 찾을 수 없어요.")
  })

  it("이름을 빌릴 곳이 없는 참조 주체는 종류만으로 부른다", () => {
    const ref: DanglingRef = { from: "wireframe:wf-orphan", field: "elementIds", missingId: "gone", kind: "element" }
    expect(danglingRefMessage(design(), ref)).toBe("이름 없는 와이어프레임에 연결된 요소를 찾을 수 없어요.")
  })

  it("접두사 없는 미지 포맷은 bare id 조회로 관용 처리, 그래도 없으면 이름 없는 항목", () => {
    const bare: DanglingRef = { from: "feat-1", field: "requirementIds", missingId: "ghost", kind: "requirement" }
    expect(danglingRefMessage(design(), bare)).toBe("기능 '결제'에 연결된 요구사항을 찾을 수 없어요.")
    const unknown: DanglingRef = { from: "ghost", field: "pageIds", missingId: "gone", kind: "page" }
    expect(danglingRefMessage(design(), unknown)).toBe("이름 없는 항목에 연결된 페이지를 찾을 수 없어요.")
  })
})

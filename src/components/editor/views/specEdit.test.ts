import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import {
  buildAddAcceptanceCriterionPatch,
  buildAddDetailFeaturePatch,
  buildAddRequirementPatch,
  buildBulkRequirementPatch,
  createDetailFeature,
  createRequirement,
} from "./specEdit"

// 편집 인터랙션(#30·#34·#37·#42) 패치 빌더 — 전부 순수. 저장은 design-patch 헬퍼가 맡는다.

function makeDesign(): WorkspaceDesign {
  return {
    requirements: [
      { id: "req-a", title: "가입", description: "", status: "approved", priority: "high", role: "고객", acceptanceCriteria: ["이메일 검증"] },
      { id: "req-b", title: "결제", description: "", status: "draft", priority: "low", role: "", acceptanceCriteria: [] },
    ],
    features: [
      {
        id: "feat-a",
        name: "회원가입 폼",
        description: "",
        detailFeatures: [{ id: "detail-a", title: "약관 동의", description: "" }],
        requirementIds: ["req-a"],
        pageIds: [],
        apiIds: [],
      },
    ],
    pages: [],
    flows: [],
    wireframes: [],
    elements: [],
  }
}

describe("createRequirement (#30 — 기본값)", () => {
  it("status=draft·priority=medium·역할 빈 값으로 만든다", () => {
    const req = createRequirement("새 요구사항", "req-new")
    expect(req).toEqual({
      id: "req-new",
      title: "새 요구사항",
      description: "",
      status: "draft",
      priority: "medium",
      role: "",
      acceptanceCriteria: [],
    })
  })

  it("id를 안 주면 req- 접두 id를 생성한다", () => {
    const req = createRequirement("제목")
    expect(req.id).toMatch(/^req-[0-9a-f]{8}$/)
  })
})

describe("createDetailFeature (#42 — 기본값)", () => {
  it("빈 설명의 DetailFeature를 만든다", () => {
    expect(createDetailFeature("사진 첨부", "detail-new")).toEqual({ id: "detail-new", title: "사진 첨부", description: "" })
  })

  it("id를 안 주면 detail- 접두 id를 생성한다", () => {
    expect(createDetailFeature("제목").id).toMatch(/^detail-[0-9a-f]{8}$/)
  })
})

describe("buildAddRequirementPatch (#30)", () => {
  it("requirements 컬렉션만 담은 패치를 만든다(맨 뒤 추가)", () => {
    const design = makeDesign()
    const req = createRequirement("새 요구사항", "req-new")
    const patch = buildAddRequirementPatch(design, req)
    expect(patch).not.toBeNull()
    expect(Object.keys(patch!)).toEqual(["requirements"])
    expect(patch!.requirements!.map((r) => r.id)).toEqual(["req-a", "req-b", "req-new"])
  })

  it("같은 id가 이미 있으면 null(재적용 시 이중 추가 방지)", () => {
    const design = makeDesign()
    expect(buildAddRequirementPatch(design, createRequirement("중복", "req-a"))).toBeNull()
  })

  it("원본 design을 변형하지 않는다", () => {
    const design = makeDesign()
    buildAddRequirementPatch(design, createRequirement("새", "req-new"))
    expect(design.requirements).toHaveLength(2)
  })
})

describe("buildAddAcceptanceCriterionPatch (#37)", () => {
  it("대상 요구사항의 acceptanceCriteria에 push한 requirements 패치를 만든다", () => {
    const design = makeDesign()
    const patch = buildAddAcceptanceCriterionPatch(design, "req-a", "  전화번호 검증  ")
    expect(patch).not.toBeNull()
    expect(Object.keys(patch!)).toEqual(["requirements"])
    const target = patch!.requirements!.find((r) => r.id === "req-a")!
    expect(target.acceptanceCriteria).toEqual(["이메일 검증", "전화번호 검증"])
  })

  it("빈 문자열(공백만)이면 null — 취소 계약", () => {
    expect(buildAddAcceptanceCriterionPatch(makeDesign(), "req-a", "   ")).toBeNull()
  })

  it("요구사항이 사라졌으면 null(동시 삭제 대비)", () => {
    expect(buildAddAcceptanceCriterionPatch(makeDesign(), "req-없음", "기준")).toBeNull()
  })

  it("원본 요구사항 객체를 변형하지 않는다", () => {
    const design = makeDesign()
    buildAddAcceptanceCriterionPatch(design, "req-a", "기준")
    expect(design.requirements[0].acceptanceCriteria).toEqual(["이메일 검증"])
  })
})

describe("buildAddDetailFeaturePatch (#42)", () => {
  it("대상 기능의 detailFeatures에 push한 features 패치를 만든다", () => {
    const design = makeDesign()
    const patch = buildAddDetailFeaturePatch(design, "feat-a", createDetailFeature("사진 첨부", "detail-new"))
    expect(patch).not.toBeNull()
    expect(Object.keys(patch!)).toEqual(["features"])
    const target = patch!.features!.find((f) => f.id === "feat-a")!
    expect(target.detailFeatures.map((d) => d.id)).toEqual(["detail-a", "detail-new"])
  })

  it("기능이 사라졌으면 null(동시 삭제 대비)", () => {
    expect(buildAddDetailFeaturePatch(makeDesign(), "feat-없음", createDetailFeature("x", "detail-x"))).toBeNull()
  })

  it("원본 기능 객체를 변형하지 않는다", () => {
    const design = makeDesign()
    buildAddDetailFeaturePatch(design, "feat-a", createDetailFeature("새", "detail-new"))
    expect(design.features[0].detailFeatures).toHaveLength(1)
  })
})

describe("buildBulkRequirementPatch (#34 — PATCH 1회 계약)", () => {
  it("선택 id 전부에 상태를 일괄 적용한다", () => {
    const patch = buildBulkRequirementPatch(makeDesign(), ["req-a", "req-b"], { status: "approved" })
    expect(patch).not.toBeNull()
    expect(patch!.requirements!.map((r) => r.status)).toEqual(["approved", "approved"])
  })

  it("역할 일괄 지정 — 다른 필드는 보존한다", () => {
    const patch = buildBulkRequirementPatch(makeDesign(), ["req-b"], { role: " 관리자 " })
    const [a, b] = patch!.requirements!
    expect(a.role).toBe("고객")
    expect(b.role).toBe("관리자")
    expect(b.title).toBe("결제")
  })

  it("사라진 id는 건너뛴다 — 남은 대상이 있으면 패치 생성", () => {
    const patch = buildBulkRequirementPatch(makeDesign(), ["req-a", "req-없음"], { status: "deprecated" })
    expect(patch).not.toBeNull()
    expect(patch!.requirements!.find((r) => r.id === "req-a")!.status).toBe("deprecated")
  })

  it("대상이 전부 사라졌으면 null(빈 저장 방지)", () => {
    expect(buildBulkRequirementPatch(makeDesign(), ["req-없음"], { status: "draft" })).toBeNull()
  })

  it("바꿀 내용이 없으면 null(무의미 PATCH 방지)", () => {
    expect(buildBulkRequirementPatch(makeDesign(), ["req-a"], {})).toBeNull()
    expect(buildBulkRequirementPatch(makeDesign(), ["req-a"], { role: "  " })).toBeNull()
  })

  it("원본을 변형하지 않는다", () => {
    const design = makeDesign()
    buildBulkRequirementPatch(design, ["req-a"], { status: "deprecated" })
    expect(design.requirements[0].status).toBe("approved")
  })
})

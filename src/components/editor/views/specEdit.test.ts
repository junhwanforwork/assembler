import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import {
  buildAddAcceptanceCriterionPatch,
  buildAddDetailFeaturePatch,
  buildAddRequirementPatch,
  buildBulkRequirementPatch,
  buildSetChangeStatusPatch,
  buildSetImplStatusPatch,
  buildSetReviewPatch,
  buildUpdateDetailFeaturePatch,
  buildUpdateFeaturePatch,
  buildUpdateRequirementPatch,
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

describe("buildUpdateRequirementPatch (직접 수정 — 제목/설명)", () => {
  it("제목을 바꾼 requirements 패치를 만든다(trim)", () => {
    const patch = buildUpdateRequirementPatch(makeDesign(), "req-a", { title: "  회원 가입  " })
    expect(Object.keys(patch!)).toEqual(["requirements"])
    expect(patch!.requirements!.find((r) => r.id === "req-a")!.title).toBe("회원 가입")
  })

  it("설명은 빈 값으로 지울 수 있다(빈 허용)", () => {
    const design = makeDesign()
    design.requirements[0].description = "기존 설명"
    const patch = buildUpdateRequirementPatch(design, "req-a", { description: "   " })
    expect(patch!.requirements!.find((r) => r.id === "req-a")!.description).toBe("")
  })

  it("빈 제목이면 null — 제목 필수(취소)", () => {
    expect(buildUpdateRequirementPatch(makeDesign(), "req-a", { title: "   " })).toBeNull()
  })

  it("값이 그대로면 null — 무변경 스킵(불필요 PATCH 0)", () => {
    expect(buildUpdateRequirementPatch(makeDesign(), "req-a", { title: "가입" })).toBeNull()
  })

  it("대상이 사라졌으면 null", () => {
    expect(buildUpdateRequirementPatch(makeDesign(), "req-없음", { title: "x" })).toBeNull()
  })

  it("다른 필드는 보존한다", () => {
    const patch = buildUpdateRequirementPatch(makeDesign(), "req-a", { title: "새 제목" })
    const target = patch!.requirements!.find((r) => r.id === "req-a")!
    expect(target.status).toBe("approved")
    expect(target.acceptanceCriteria).toEqual(["이메일 검증"])
  })

  it("원본을 변형하지 않는다", () => {
    const design = makeDesign()
    buildUpdateRequirementPatch(design, "req-a", { title: "새" })
    expect(design.requirements[0].title).toBe("가입")
  })
})

describe("buildUpdateFeaturePatch (직접 수정 — 이름/설명)", () => {
  it("이름을 바꾼 features 패치를 만든다(trim)", () => {
    const patch = buildUpdateFeaturePatch(makeDesign(), "feat-a", { name: "  가입 폼  " })
    expect(Object.keys(patch!)).toEqual(["features"])
    expect(patch!.features!.find((f) => f.id === "feat-a")!.name).toBe("가입 폼")
  })

  it("빈 이름이면 null — 이름 필수", () => {
    expect(buildUpdateFeaturePatch(makeDesign(), "feat-a", { name: "  " })).toBeNull()
  })

  it("무변경이면 null", () => {
    expect(buildUpdateFeaturePatch(makeDesign(), "feat-a", { name: "회원가입 폼" })).toBeNull()
  })

  it("detailFeatures 등 다른 필드는 보존한다", () => {
    const patch = buildUpdateFeaturePatch(makeDesign(), "feat-a", { description: "폼 설명" })
    const target = patch!.features!.find((f) => f.id === "feat-a")!
    expect(target.detailFeatures).toHaveLength(1)
    expect(target.requirementIds).toEqual(["req-a"])
  })
})

describe("buildUpdateDetailFeaturePatch (직접 수정 — 상세기능 제목/설명)", () => {
  it("상세기능 제목을 바꾼 features 패치를 만든다", () => {
    const patch = buildUpdateDetailFeaturePatch(makeDesign(), "feat-a", "detail-a", { title: "약관 전체 동의" })
    const detail = patch!.features!.find((f) => f.id === "feat-a")!.detailFeatures.find((d) => d.id === "detail-a")!
    expect(detail.title).toBe("약관 전체 동의")
  })

  it("빈 제목이면 null", () => {
    expect(buildUpdateDetailFeaturePatch(makeDesign(), "feat-a", "detail-a", { title: " " })).toBeNull()
  })

  it("상세기능이 사라졌으면 null", () => {
    expect(buildUpdateDetailFeaturePatch(makeDesign(), "feat-a", "detail-없음", { title: "x" })).toBeNull()
  })

  it("기능이 사라졌으면 null", () => {
    expect(buildUpdateDetailFeaturePatch(makeDesign(), "feat-없음", "detail-a", { title: "x" })).toBeNull()
  })
})

describe("buildSetImplStatusPatch (구현 상태 설정)", () => {
  it("미설정 기능에 implStatus를 설정한다", () => {
    const patch = buildSetImplStatusPatch(makeDesign(), "feat-a", "in_progress")
    expect(patch!.features!.find((f) => f.id === "feat-a")!.implStatus).toBe("in_progress")
  })

  it("같은 값이면 null(무변경 스킵)", () => {
    const design = makeDesign()
    design.features[0].implStatus = "implemented"
    expect(buildSetImplStatusPatch(design, "feat-a", "implemented")).toBeNull()
  })

  it("기능이 사라졌으면 null", () => {
    expect(buildSetImplStatusPatch(makeDesign(), "feat-없음", "partial")).toBeNull()
  })
})

describe("buildSetChangeStatusPatch (변경 상태 설정)", () => {
  it("changeStatus를 설정한다", () => {
    const patch = buildSetChangeStatusPatch(makeDesign(), "feat-a", "changed")
    expect(patch!.features!.find((f) => f.id === "feat-a")!.changeStatus).toBe("changed")
  })

  it("같은 값이면 null", () => {
    const design = makeDesign()
    design.features[0].changeStatus = "confirmed"
    expect(buildSetChangeStatusPatch(design, "feat-a", "confirmed")).toBeNull()
  })
})

describe("buildSetReviewPatch (역할별 확인 설정)", () => {
  it("역할 확인 상태를 설정한다", () => {
    const patch = buildSetReviewPatch(makeDesign(), "feat-a", "planner", "checked")
    expect(patch!.features!.find((f) => f.id === "feat-a")!.reviews).toEqual({ planner: "checked" })
  })

  it("기존 역할을 보존하며 새 역할을 추가한다", () => {
    const design = makeDesign()
    design.features[0].reviews = { planner: "checked" }
    const patch = buildSetReviewPatch(design, "feat-a", "developer", "needs_discussion")
    expect(patch!.features!.find((f) => f.id === "feat-a")!.reviews).toEqual({
      planner: "checked",
      developer: "needs_discussion",
    })
  })

  it("not_checked면 해당 역할 키를 삭제한다(배지 '—' 복원)", () => {
    const design = makeDesign()
    design.features[0].reviews = { planner: "checked", developer: "checked" }
    const patch = buildSetReviewPatch(design, "feat-a", "planner", "not_checked")
    expect(patch!.features!.find((f) => f.id === "feat-a")!.reviews).toEqual({ developer: "checked" })
  })

  it("이미 미확인인 역할을 not_checked로 두면 null(무변경)", () => {
    expect(buildSetReviewPatch(makeDesign(), "feat-a", "planner", "not_checked")).toBeNull()
  })

  it("같은 상태로 재설정하면 null", () => {
    const design = makeDesign()
    design.features[0].reviews = { designer: "checked" }
    expect(buildSetReviewPatch(design, "feat-a", "designer", "checked")).toBeNull()
  })

  it("원본 reviews를 변형하지 않는다", () => {
    const design = makeDesign()
    design.features[0].reviews = { planner: "checked" }
    buildSetReviewPatch(design, "feat-a", "planner", "not_checked")
    expect(design.features[0].reviews).toEqual({ planner: "checked" })
  })
})

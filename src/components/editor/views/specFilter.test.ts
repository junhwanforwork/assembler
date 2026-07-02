import { describe, expect, it } from "vitest"
import type { Feature, Priority, Requirement, RequirementStatus } from "@/lib/types/assembler"
import { buildFeatureNamesByReq, collectRoles, EMPTY_SPEC_FILTERS, filterRequirements, hasActiveSpecFilters } from "./specFilter"

function req(
  id: string,
  over: Partial<Pick<Requirement, "title" | "description" | "status" | "priority" | "role">> = {},
): Requirement {
  return {
    id,
    title: over.title ?? `요구사항 ${id}`,
    description: over.description ?? "",
    status: (over.status ?? "draft") as RequirementStatus,
    priority: (over.priority ?? "medium") as Priority,
    role: over.role ?? "",
    acceptanceCriteria: [],
  }
}

function feat(id: string, name: string, requirementIds: string[]): Feature {
  return { id, name, description: "", detailFeatures: [], requirementIds, pageIds: [], apiIds: [] }
}

describe("collectRoles", () => {
  it("design의 role 고유값만 모으고 빈 값은 뺀다", () => {
    const rs = [req("a", { role: "고객" }), req("b", { role: "직원" }), req("c", { role: "고객" }), req("d", { role: " " })]
    expect(collectRoles(rs)).toEqual(["고객", "직원"])
  })

  it("정렬은 로케일 순서", () => {
    const rs = [req("a", { role: "직원" }), req("b", { role: "고객" })]
    expect(collectRoles(rs)).toEqual(["고객", "직원"])
  })
})

describe("filterRequirements — #27 상태·중요도·역할 AND 결합", () => {
  const rs = [
    req("r1", { status: "approved", priority: "high", role: "고객" }),
    req("r2", { status: "draft", priority: "high", role: "직원" }),
    req("r3", { status: "approved", priority: "low", role: "고객" }),
  ]

  it("필터 없음 → 전체 유지", () => {
    expect(filterRequirements(rs, buildFeatureNamesByReq([]), EMPTY_SPEC_FILTERS)).toHaveLength(3)
  })

  it("상태 단독", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, status: "approved" })
    expect(out.map((r) => r.id)).toEqual(["r1", "r3"])
  })

  it("중요도 단독", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, priority: "high" })
    expect(out.map((r) => r.id)).toEqual(["r1", "r2"])
  })

  it("역할 단독", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, role: "직원" })
    expect(out.map((r) => r.id)).toEqual(["r2"])
  })

  it("상태 AND 역할", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, status: "approved", role: "고객" })
    expect(out.map((r) => r.id)).toEqual(["r1", "r3"])
  })

  it("셋 다 AND — 아무것도 안 맞으면 빈 배열", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, status: "draft", priority: "low", role: "고객" })
    expect(out).toHaveLength(0)
  })
})

describe("filterRequirements — #29 인라인 검색(#27과 AND)", () => {
  const rs = [
    req("r1", { title: "수리 접수", status: "approved" }),
    req("r2", { title: "수리 결제", description: "카드 결제 지원", status: "draft" }),
    req("r3", { title: "현황 조회", status: "approved" }),
  ]
  const fs = [feat("f1", "고장 유형 선택", ["r1"])]

  it("제목 부분 일치 (대소문자 무시)", () => {
    const out = filterRequirements([req("x", { title: "Kiosk Home" })], buildFeatureNamesByReq([]), { ...EMPTY_SPEC_FILTERS, query: "kiosk" })
    expect(out).toHaveLength(1)
  })

  it("설명 일치", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq(fs), { ...EMPTY_SPEC_FILTERS, query: "카드" })
    expect(out.map((r) => r.id)).toEqual(["r2"])
  })

  it("연결된 기능 이름 일치 → 부모 요구사항이 잡힌다", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq(fs), { ...EMPTY_SPEC_FILTERS, query: "고장 유형" })
    expect(out.map((r) => r.id)).toEqual(["r1"])
  })

  it("검색과 필터는 AND — 검색이 잡아도 상태 필터가 거르면 빠진다", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq(fs), { ...EMPTY_SPEC_FILTERS, query: "수리", status: "approved" })
    expect(out.map((r) => r.id)).toEqual(["r1"])
  })

  it("공백만 있는 query는 무시", () => {
    const out = filterRequirements(rs, buildFeatureNamesByReq(fs), { ...EMPTY_SPEC_FILTERS, query: "   " })
    expect(out).toHaveLength(3)
  })
})

describe("hasActiveSpecFilters", () => {
  it("기본값이면 false, 하나라도 걸리면 true", () => {
    expect(hasActiveSpecFilters(EMPTY_SPEC_FILTERS)).toBe(false)
    expect(hasActiveSpecFilters({ ...EMPTY_SPEC_FILTERS, status: "draft" })).toBe(true)
    expect(hasActiveSpecFilters({ ...EMPTY_SPEC_FILTERS, query: "수리" })).toBe(true)
  })
})

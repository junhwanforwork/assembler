import { describe, it, expect } from "vitest"
import { applyChangePlan } from "./apply"
import type { ChangePlan } from "@/lib/types/chat"
import type { WorkspaceDesign } from "@/lib/types/assembler"

// 변경 계획 적용(순수) — 도크 "적용하기"가 이 결과를 스코프드 PATCH(ASM-010)로 저장한다.
// 참조 무결성(dangling)은 여기서 검사하지 않는다 — PATCH의 findDanglingRefs(409)가 최종 가드.

function baseDesign(): WorkspaceDesign {
  return {
    requirements: [
      { id: "req-1", title: "로그인", description: "", status: "approved", priority: "high", role: "user", acceptanceCriteria: [] },
    ],
    features: [],
    pages: [{ id: "page-1", name: "홈", description: "", wireframeId: null }],
    flows: [],
    wireframes: [],
    elements: [],
  }
}

function plan(ops: ChangePlan["ops"]): ChangePlan {
  return { title: "t", summary: "s", ops }
}

describe("applyChangePlan", () => {
  it("add — 컬렉션 끝에 항목을 붙이고 touched에 기록한다", () => {
    const result = applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "add", targetId: "page-pay", summary: "s", payload: { id: "page-pay", name: "결제", description: "", wireframeId: null } },
    ]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.design.pages.map((p) => p.id)).toEqual(["page-1", "page-pay"])
      expect(result.value.touched).toEqual(["pages"])
    }
  })
  it("update — 항목을 payload로 통째 교체한다", () => {
    const result = applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "requirements", action: "update", targetId: "req-1", summary: "s", payload: { id: "req-1", title: "소셜 로그인", description: "", status: "draft", priority: "low", role: "user", acceptanceCriteria: [] } },
    ]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.design.requirements[0].title).toBe("소셜 로그인")
      expect(result.value.design.requirements[0].priority).toBe("low")
    }
  })
  it("remove — 항목을 제거한다", () => {
    const result = applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "requirements", action: "remove", targetId: "req-1", summary: "s", payload: null },
    ]))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.design.requirements).toEqual([])
  })
  it("여러 op를 순서대로 적용하고 touched는 중복 없이 모은다", () => {
    const result = applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "add", targetId: "page-2", summary: "s", payload: { id: "page-2", name: "결제", description: "", wireframeId: null } },
      { id: "op-1", collection: "pages", action: "update", targetId: "page-2", summary: "s", payload: { id: "page-2", name: "결제 완료", description: "", wireframeId: null } },
      { id: "op-2", collection: "requirements", action: "remove", targetId: "req-1", summary: "s", payload: null },
    ]))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.design.pages.map((p) => p.name)).toEqual(["홈", "결제 완료"])
      expect(result.value.design.requirements).toEqual([])
      expect(result.value.touched).toEqual(["pages", "requirements"])
    }
  })
  it("충돌 — add 대상이 이미 있거나 update/remove 대상이 없으면 plan_conflict", () => {
    expect(applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "add", targetId: "page-1", summary: "s", payload: { id: "page-1" } },
    ]))).toEqual({ ok: false, error: "plan_conflict" })
    expect(applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "update", targetId: "page-404", summary: "s", payload: { id: "page-404" } },
    ]))).toEqual({ ok: false, error: "plan_conflict" })
    expect(applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "remove", targetId: "page-404", summary: "s", payload: null },
    ]))).toEqual({ ok: false, error: "plan_conflict" })
  })
  it("add/update에 payload가 없으면 plan_conflict", () => {
    expect(applyChangePlan(baseDesign(), plan([
      { id: "op-0", collection: "pages", action: "add", targetId: "page-2", summary: "s", payload: null },
    ]))).toEqual({ ok: false, error: "plan_conflict" })
  })
  it("원본 디자인을 변형하지 않는다 (순수 함수)", () => {
    const current = baseDesign()
    const snapshot = JSON.parse(JSON.stringify(current))
    applyChangePlan(current, plan([
      { id: "op-0", collection: "requirements", action: "remove", targetId: "req-1", summary: "s", payload: null },
    ]))
    expect(current).toEqual(snapshot)
  })
})

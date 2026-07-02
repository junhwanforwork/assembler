import { describe, it, expect } from "vitest"
import { parseChatOutput } from "./parse"
import type { WorkspaceDesign } from "@/lib/types/assembler"

// AI 출력 살균 — suggestions/parse와 같은 규율: 검증 실패 항목은 버리고,
// 계획이 통째로 무효면 에러(빈 계획을 도크에 띄우지 않는다).

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

function output(o: Record<string, unknown>): string {
  return JSON.stringify({ mode: "answer", text: "", clarify: null, plan: null, ...o })
}

describe("parseChatOutput — answer", () => {
  it("text 블록 하나로 변환한다", () => {
    const result = parseChatOutput(output({ mode: "answer", text: "로그인 요구사항이 1개 있어요." }), baseDesign())
    expect(result).toEqual({ ok: true, value: [{ kind: "text", text: "로그인 요구사항이 1개 있어요." }] })
  })
  it("본문 없는 answer는 invalid_chat_output", () => {
    expect(parseChatOutput(output({ mode: "answer", text: " " }), baseDesign())).toEqual({ ok: false, error: "invalid_chat_output" })
  })
  it("JSON이 아니면 invalid_json", () => {
    expect(parseChatOutput("이건 JSON이 아니에요", baseDesign())).toEqual({ ok: false, error: "invalid_json" })
  })
})

describe("parseChatOutput — clarify", () => {
  it("질문 + 옵션(id 파생)을 clarify 블록으로 변환한다", () => {
    const result = parseChatOutput(
      output({ mode: "clarify", text: "확인할게요.", clarify: { question: "누가 쓰나요?", options: [{ label: "일반 사용자" }, { label: "관리자" }] } }),
      baseDesign()
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value[0]).toEqual({ kind: "text", text: "확인할게요." })
      expect(result.value[1]).toEqual({
        kind: "clarify",
        question: "누가 쓰나요?",
        options: [
          { id: "opt-0", label: "일반 사용자" },
          { id: "opt-1", label: "관리자" },
        ],
      })
    }
  })
  it("옵션이 2개 미만이면 text로 폴백, text도 없으면 에러", () => {
    const fallback = parseChatOutput(output({ mode: "clarify", text: "질문이 있어요.", clarify: { question: "?", options: [{ label: "하나" }] } }), baseDesign())
    expect(fallback).toEqual({ ok: true, value: [{ kind: "text", text: "질문이 있어요." }] })
    expect(parseChatOutput(output({ mode: "clarify", text: "", clarify: { question: "?", options: [] } }), baseDesign())).toEqual({
      ok: false,
      error: "invalid_chat_output",
    })
  })
})

describe("parseChatOutput — plan", () => {
  const validOp = {
    collection: "requirements",
    action: "update",
    targetId: "req-1",
    summary: "로그인 요구사항 우선순위를 바꿔요",
    payload: JSON.stringify({ id: "req-1", title: "로그인", priority: "low" }),
  }

  it("유효한 계획을 plan 블록으로 변환한다 (op id 파생, payload 파싱)", () => {
    const result = parseChatOutput(
      output({ mode: "plan", text: "이렇게 바꿀게요.", plan: { title: "우선순위 조정", summary: "1건 수정해요", ops: [validOp] } }),
      baseDesign()
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value[0]).toEqual({ kind: "text", text: "이렇게 바꿀게요." })
      const plan = result.value[1]
      expect(plan.kind).toBe("plan")
      if (plan.kind === "plan") {
        expect(plan.plan.ops).toEqual([
          {
            id: "op-0",
            collection: "requirements",
            action: "update",
            targetId: "req-1",
            summary: "로그인 요구사항 우선순위를 바꿔요",
            payload: { id: "req-1", title: "로그인", priority: "low" },
          },
        ])
      }
    }
  })
  it("update/remove 대상이 현존하지 않으면 그 op만 버린다", () => {
    const ghost = { ...validOp, targetId: "req-404", payload: JSON.stringify({ id: "req-404" }) }
    const result = parseChatOutput(
      output({ mode: "plan", text: "", plan: { title: "t", summary: "s", ops: [validOp, ghost] } }),
      baseDesign()
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const plan = result.value[0]
      if (plan.kind === "plan") expect(plan.plan.ops.map((o) => o.targetId)).toEqual(["req-1"])
    }
  })
  it("add 대상이 이미 존재하면 버리고, 새 id면 payload.id를 targetId로 강제한다", () => {
    const dupAdd = { collection: "pages", action: "add", targetId: "page-1", summary: "s", payload: JSON.stringify({ id: "page-1" }) }
    const newAdd = { collection: "pages", action: "add", targetId: "page-new", summary: "새 화면을 추가해요", payload: JSON.stringify({ id: "elsewhere", name: "결제" }) }
    const result = parseChatOutput(output({ mode: "plan", text: "", plan: { title: "t", summary: "s", ops: [dupAdd, newAdd] } }), baseDesign())
    expect(result.ok).toBe(true)
    if (result.ok) {
      const plan = result.value[0]
      if (plan.kind === "plan") {
        expect(plan.plan.ops).toHaveLength(1)
        expect(plan.plan.ops[0].targetId).toBe("page-new")
        expect(plan.plan.ops[0].payload).toEqual({ id: "page-new", name: "결제" })
      }
    }
  })
  it("remove는 payload를 null로 정규화한다", () => {
    const removeOp = { collection: "requirements", action: "remove", targetId: "req-1", summary: "요구사항을 지워요", payload: JSON.stringify({ id: "req-1" }) }
    const result = parseChatOutput(output({ mode: "plan", text: "", plan: { title: "t", summary: "s", ops: [removeOp] } }), baseDesign())
    expect(result.ok).toBe(true)
    if (result.ok) {
      const plan = result.value[0]
      if (plan.kind === "plan") expect(plan.plan.ops[0].payload).toBeNull()
    }
  })
  it("payload JSON이 깨졌거나 add/update에 payload가 없으면 그 op를 버린다", () => {
    const broken = { ...validOp, payload: "{깨진 json" }
    const missing = { ...validOp, payload: null }
    const result = parseChatOutput(output({ mode: "plan", text: "설명", plan: { title: "t", summary: "s", ops: [broken, missing] } }), baseDesign())
    expect(result).toEqual({ ok: false, error: "invalid_plan" })
  })
  it("ops가 있었는데 살균 후 전부 사라지면 invalid_plan", () => {
    const ghost = { ...validOp, targetId: "req-404" }
    expect(parseChatOutput(output({ mode: "plan", text: "", plan: { title: "t", summary: "s", ops: [ghost] } }), baseDesign())).toEqual({
      ok: false,
      error: "invalid_plan",
    })
  })
  it("ops가 처음부터 빈 계획도 invalid_plan (빈 도크 금지)", () => {
    expect(parseChatOutput(output({ mode: "plan", text: "", plan: { title: "t", summary: "s", ops: [] } }), baseDesign())).toEqual({
      ok: false,
      error: "invalid_plan",
    })
  })
})

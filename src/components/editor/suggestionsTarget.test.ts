import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { resolveSuggestionJump, suggestionTargetName } from "./suggestionsTarget"

// 최소 그래프 — 요구사항 2(하나는 기능 연결), 고립 기능 1, 페이지·플로우·엘리먼트 각 1.
const design: WorkspaceDesign = {
  requirements: [
    {
      id: "req-1",
      title: "가입할 수 있어야 한다",
      description: "",
      status: "draft",
      priority: "high",
      role: "user",
      acceptanceCriteria: [],
    },
    {
      id: "req-2",
      title: "로그인할 수 있어야 한다",
      description: "",
      status: "draft",
      priority: "medium",
      role: "user",
      acceptanceCriteria: [],
    },
  ],
  features: [
    {
      id: "feat-1",
      name: "회원가입",
      description: "",
      detailFeatures: [],
      requirementIds: ["req-1"],
      pageIds: [],
      apiIds: [],
    },
    // 고립 기능 — 요구사항 연결 없음. 인스펙터가 경로(요구사항→기능)로 못 비추므로 점프 불가.
    { id: "feat-orphan", name: "고아 기능", description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds: [] },
    // dangling 부모 — 요구사항 id가 그래프에 없음.
    { id: "feat-dangling", name: "부모 없는 기능", description: "", detailFeatures: [], requirementIds: ["req-ghost"], pageIds: [], apiIds: [] },
  ],
  pages: [{ id: "page-1", name: "가입 페이지", description: "", wireframeId: null }],
  flows: [{ id: "flow-1", name: "가입 플로우", edges: [] }],
  wireframes: [],
  elements: [
    { id: "el-1", label: "가입 버튼", type: "button", action: "Click", states: [], result: "", apiIds: [], dbTableIds: [] },
  ],
}

describe("resolveSuggestionJump", () => {
  it("요구사항 타깃 → 요구사항 점프", () => {
    expect(resolveSuggestionJump(design, "requirement", "req-1")).toEqual({ kind: "requirement", reqId: "req-1" })
  })

  it("기능 타깃 → 현존 부모 요구사항 경유 점프", () => {
    expect(resolveSuggestionJump(design, "feature", "feat-1")).toEqual({
      kind: "feature",
      reqId: "req-1",
      featureId: "feat-1",
    })
  })

  it("부모 요구사항이 없는 기능(고립·dangling)은 점프 불가", () => {
    expect(resolveSuggestionJump(design, "feature", "feat-orphan")).toBeNull()
    expect(resolveSuggestionJump(design, "feature", "feat-dangling")).toBeNull()
  })

  it("store에 대응 선택이 없는 타입(page·flow·element)은 점프 불가", () => {
    expect(resolveSuggestionJump(design, "page", "page-1")).toBeNull()
    expect(resolveSuggestionJump(design, "flow", "flow-1")).toBeNull()
    expect(resolveSuggestionJump(design, "element", "el-1")).toBeNull()
  })

  it("타깃 없음·미현존 id는 점프 불가", () => {
    expect(resolveSuggestionJump(design, null, null)).toBeNull()
    expect(resolveSuggestionJump(design, "requirement", null)).toBeNull()
    expect(resolveSuggestionJump(design, "requirement", "req-ghost")).toBeNull()
    expect(resolveSuggestionJump(design, "feature", "feat-ghost")).toBeNull()
  })
})

describe("suggestionTargetName", () => {
  it("타입별 표시 이름을 찾는다", () => {
    expect(suggestionTargetName(design, "requirement", "req-1")).toBe("가입할 수 있어야 한다")
    expect(suggestionTargetName(design, "feature", "feat-1")).toBe("회원가입")
    expect(suggestionTargetName(design, "page", "page-1")).toBe("가입 페이지")
    expect(suggestionTargetName(design, "flow", "flow-1")).toBe("가입 플로우")
    expect(suggestionTargetName(design, "element", "el-1")).toBe("가입 버튼")
  })

  it("타깃 없음·미현존 id는 null", () => {
    expect(suggestionTargetName(design, null, null)).toBeNull()
    expect(suggestionTargetName(design, "page", "page-ghost")).toBeNull()
  })
})

import { describe, it, expect } from "vitest"
import { runChat, MAX_CHAT_DESIGN_BYTES } from "./run"
import type { WorkspaceDesign } from "@/lib/types/assembler"

// AI 호출 전 early return 경로만 — 실호출 경로는 모킹 금지 규칙상 단위 테스트 대상 아님.

function emptyDesign(): WorkspaceDesign {
  return { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] }
}

describe("runChat — 호출 전 가드", () => {
  it("그래프가 챗 컨텍스트 캡을 넘으면 422 design_too_large_for_chat (호출 안 함)", async () => {
    const design = emptyDesign()
    design.requirements = [
      { id: "r-1", title: "x".repeat(MAX_CHAT_DESIGN_BYTES), description: "", status: "draft", priority: "low", role: "", acceptanceCriteria: [] },
    ]
    const result = await runChat(design, [], [], [{ role: "user", text: "질문" }])
    expect(result).toEqual({ ok: false, error: "design_too_large_for_chat", status: 422 })
  })
  it("빈 turns는 400 invalid_messages (자기 방어 — 경계 우회 호출 대비)", async () => {
    const result = await runChat(emptyDesign(), [], [], [])
    expect(result).toEqual({ ok: false, error: "invalid_messages", status: 400 })
  })
})

import { describe, expect, it } from "vitest"
import type { ChatMessage } from "./chatTurns"
import { toChatTurns } from "./chatTurns"

const user = (text: string): ChatMessage => ({ role: "user", text })
const assistantText = (text: string): ChatMessage => ({ role: "assistant", blocks: [{ kind: "text", text }] })

describe("toChatTurns — 챗 히스토리 → API messages 직렬화", () => {
  it("user/assistant 텍스트 턴을 순서대로 만든다", () => {
    const turns = toChatTurns([user("안녕"), assistantText("안녕하세요")], "결제 기능 추가해줘")
    expect(turns).toEqual([
      { role: "user", text: "안녕" },
      { role: "assistant", text: "안녕하세요" },
      { role: "user", text: "결제 기능 추가해줘" },
    ])
  })

  it("assistant 블록 배열은 한 턴 텍스트로 합친다 — clarify·plan 포함", () => {
    const msg: ChatMessage = {
      role: "assistant",
      blocks: [
        { kind: "text", text: "어느 쪽일까요?" },
        { kind: "clarify", question: "범위를 알려주세요", options: [{ id: "o1", label: "전체" }, { id: "o2", label: "일부" }] },
        { kind: "plan", plan: { title: "결제 추가", summary: "요구사항 1건 추가", ops: [] } },
      ],
    }
    const [assistantTurn] = toChatTurns([user("q"), msg], "다음").slice(1, 2)
    expect(assistantTurn.role).toBe("assistant")
    expect(assistantTurn.text).toContain("어느 쪽일까요?")
    expect(assistantTurn.text).toContain("범위를 알려주세요")
    expect(assistantTurn.text).toContain("전체")
    expect(assistantTurn.text).toContain("결제 추가")
  })

  it("서버 캡(20턴)에 맞춰 오래된 턴부터 버린다 — 마지막은 항상 이번 입력", () => {
    const history: ChatMessage[] = []
    for (let i = 0; i < 30; i++) {
      history.push(user(`질문 ${i}`), assistantText(`답변 ${i}`))
    }
    const turns = toChatTurns(history, "마지막 질문")
    expect(turns.length).toBeLessThanOrEqual(20)
    expect(turns[turns.length - 1]).toEqual({ role: "user", text: "마지막 질문" })
    // 첫 턴은 user여야 한다(Anthropic 계약 — 서버가 선행 assistant를 드롭하기 전에 클라가 맞춘다).
    expect(turns[0].role).toBe("user")
  })

  it("빈 텍스트 블록만 있는 assistant 턴은 건너뛴다(서버가 빈 턴을 거부)", () => {
    const empty: ChatMessage = { role: "assistant", blocks: [] }
    const turns = toChatTurns([user("q"), empty], "다음")
    expect(turns).toEqual([
      { role: "user", text: "q" },
      { role: "user", text: "다음" },
    ])
  })

  it("긴 텍스트는 서버 캡(4000자) 안으로 자른다", () => {
    const turns = toChatTurns([], "가".repeat(5000))
    expect(turns[0].text.length).toBeLessThanOrEqual(4000)
  })
})

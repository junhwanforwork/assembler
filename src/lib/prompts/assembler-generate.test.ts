import { describe, it, expect } from "vitest"
import { GENERATE_SYSTEM, buildGenerateUserMessage } from "./assembler-generate"

// ASM-052 — 생성 계약 개정: 와이어 후퇴(wireframes/elements 생성 중단) + feature.dbTableIds 승격.
// 계약 문면을 고정해 회귀(와이어 부활·dbTableIds 누락)를 잡는다. 유료 호출 없음 — 문자열 검증만.

describe("GENERATE_SYSTEM — 와이어 후퇴 계약", () => {
  it("output_contract에 wireframes/elements 컬렉션이 없다", () => {
    expect(GENERATE_SYSTEM).not.toContain('"wireframes"')
    expect(GENERATE_SYSTEM).not.toContain('"elements"')
    expect(GENERATE_SYSTEM).not.toContain("wireframeId")
    expect(GENERATE_SYSTEM).not.toContain("elementIds")
  })

  it("features 계약에 dbTableIds가 있다 (기능 = API·DB 연결의 1급 주인)", () => {
    expect(GENERATE_SYSTEM).toContain('"dbTableIds"')
    expect(GENERATE_SYSTEM).toContain('"apiIds"')
  })

  it("사슬이 개정판(Requirement→Feature→Page·Flow, Feature→Api·Database)이다", () => {
    expect(GENERATE_SYSTEM).not.toContain("UIElement")
    expect(GENERATE_SYSTEM).not.toContain("Wireframe")
    expect(GENERATE_SYSTEM).toContain("Requirement")
    expect(GENERATE_SYSTEM).toContain("Feature")
  })

  it("코드-진실 환각 금지 규칙은 유지된다", () => {
    expect(GENERATE_SYSTEM).toContain("지어내지 않는다")
  })
})

describe("buildGenerateUserMessage", () => {
  it("빈 코드-진실이면 빈 배열 지시를 싣는다", () => {
    const msg = buildGenerateUserMessage("산책 앱", [], [])
    expect(msg).toContain("apiIds는 모두 빈 배열로")
    expect(msg).toContain("dbTableIds는 모두 빈 배열로")
    expect(msg).toContain("산책 앱")
  })
})

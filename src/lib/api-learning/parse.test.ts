import { describe, it, expect } from "vitest"
import { parseApiNote } from "./parse"

// ASM-064 — 엔티티 살균(db-learning parse 원리): AI가 신고한 mentionedNames를
// 증거 화이트리스트(기능·테이블 이름)와 대조, 하나라도 밖이면 환각으로 거부한다.

const ALLOWED: ReadonlySet<string> = new Set(["회원가입", "users"])

function text(obj: unknown): string {
  return JSON.stringify(obj)
}

describe("parseApiNote", () => {
  it("정상 출력을 통과시킨다", () => {
    const r = parseApiNote(text({ explanation: "회원가입에서 쓰는 API예요.", grounded: true, mentionedNames: ["회원가입"], pros: [], cons: [] }), ALLOWED)
    expect(r).toEqual({ ok: true, value: { explanation: "회원가입에서 쓰는 API예요.", grounded: true } })
  })

  it("JSON이 아니면 invalid_json", () => {
    expect(parseApiNote("JSON 아님", ALLOWED)).toEqual({ ok: false, error: "invalid_json" })
  })

  it("빈 explanation은 empty_explanation", () => {
    expect(parseApiNote(text({ explanation: "  ", grounded: true, mentionedNames: [] }), ALLOWED)).toEqual({ ok: false, error: "empty_explanation" })
  })

  it("화이트리스트 밖 이름을 언급하면 hallucinated_name", () => {
    const r = parseApiNote(text({ explanation: "결제 기능에서 써요.", grounded: true, mentionedNames: ["결제"] }), ALLOWED)
    expect(r).toEqual({ ok: false, error: "hallucinated_name" })
  })

  it("pros/cons는 3개로 클램프하고 빈 항목은 버린다", () => {
    const r = parseApiNote(
      text({ explanation: "설명", grounded: true, mentionedNames: [], pros: ["a", "b", "c", "d"], cons: ["  ", "x"] }),
      ALLOWED,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.pros).toEqual(["a", "b", "c"])
      expect(r.value.cons).toEqual(["x"])
    }
  })

  it("pros/cons가 배열이 아니면 조용히 버린다(단문 노트 강등)", () => {
    const r = parseApiNote(text({ explanation: "설명", grounded: false, mentionedNames: [], pros: "not-array", cons: 3 }), ALLOWED)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.pros).toBeUndefined()
      expect(r.value.cons).toBeUndefined()
    }
  })

  it("grounded는 true 리터럴만 true로 본다", () => {
    const r = parseApiNote(text({ explanation: "설명", grounded: "true", mentionedNames: [] }), ALLOWED)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.grounded).toBe(false)
  })
})

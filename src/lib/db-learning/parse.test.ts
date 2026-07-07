import { describe, it, expect } from "vitest"
import { parseDbNote } from "./parse"

// 살균 — 환각 방어 4층. 신고된 언급 테이블이 실재 집합 밖이면 hallucinated_table 거부.

const known: ReadonlySet<string> = new Set(["customers", "repairs"])

describe("parseDbNote", () => {
  it("정상 JSON을 설명으로 파싱한다", () => {
    const text = JSON.stringify({ explanation: "고객이 맡긴 수리 건을 보관해요.", grounded: true, mentionedTables: ["customers"] })
    const r = parseDbNote(text, known)
    expect(r).toEqual({ ok: true, value: { explanation: "고객이 맡긴 수리 건을 보관해요.", grounded: true } })
  })

  it("```json 펜스로 감싸도 추출한다", () => {
    const text = "설명이에요:\n```json\n" + JSON.stringify({ explanation: "재고를 담아요.", grounded: false, mentionedTables: [] }) + "\n```"
    expect(parseDbNote(text, known).ok).toBe(true)
  })

  it("실재하지 않는 테이블을 언급하면 hallucinated_table로 거부한다", () => {
    const text = JSON.stringify({ explanation: "parts 테이블과 연결돼 부품을 관리해요.", grounded: true, mentionedTables: ["parts"] })
    expect(parseDbNote(text, known)).toEqual({ ok: false, error: "hallucinated_table" })
  })

  it("언급 테이블이 전부 실재하면 통과한다", () => {
    const text = JSON.stringify({ explanation: "customers·repairs와 연결돼요.", grounded: true, mentionedTables: ["customers", "repairs"] })
    expect(parseDbNote(text, known).ok).toBe(true)
  })

  it("설명이 비면 empty_explanation", () => {
    const text = JSON.stringify({ explanation: "   ", grounded: false, mentionedTables: [] })
    expect(parseDbNote(text, known)).toEqual({ ok: false, error: "empty_explanation" })
  })

  it("JSON이 아니면 invalid_json", () => {
    expect(parseDbNote("미안하지만 못 만들겠어요", known)).toEqual({ ok: false, error: "invalid_json" })
  })

  it("grounded가 boolean true가 아니면 false로 좁힌다", () => {
    const text = JSON.stringify({ explanation: "재고를 담아요.", grounded: "yes", mentionedTables: [] })
    const r = parseDbNote(text, known)
    expect(r).toEqual({ ok: true, value: { explanation: "재고를 담아요.", grounded: false } })
  })
})

// ASM-057 — 출력 구조화(요약 + 좋은 점 ≤3 + 주의할 점 ≤3). 미지 형식은 관용(단문이면 요약만).
describe("parseDbNote — pros/cons 구조화", () => {
  it("pros/cons 배열을 트림해서 파싱한다", () => {
    const text = JSON.stringify({
      explanation: "고객 수리 건을 보관해요.",
      grounded: true,
      mentionedTables: [],
      pros: [" 수리 이력이 한 곳에 모여요. "],
      cons: ["담당자 정보는 따로 없어요."],
    })
    expect(parseDbNote(text, known)).toEqual({
      ok: true,
      value: {
        explanation: "고객 수리 건을 보관해요.",
        grounded: true,
        pros: ["수리 이력이 한 곳에 모여요."],
        cons: ["담당자 정보는 따로 없어요."],
      },
    })
  })

  it("pros/cons가 없으면(구형 단문) 값에 싣지 않는다", () => {
    const text = JSON.stringify({ explanation: "재고를 담아요.", grounded: false, mentionedTables: [] })
    const r = parseDbNote(text, known)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect("pros" in r.value).toBe(false)
      expect("cons" in r.value).toBe(false)
    }
  })

  it("빈 배열·공백 항목만이면 싣지 않는다(빈 섹션 방출 금지)", () => {
    const text = JSON.stringify({ explanation: "재고를 담아요.", grounded: false, mentionedTables: [], pros: [], cons: ["  ", ""] })
    const r = parseDbNote(text, known)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect("pros" in r.value).toBe(false)
      expect("cons" in r.value).toBe(false)
    }
  })

  it("비배열·비문자열 항목은 관용적으로 걸러낸다", () => {
    const text = JSON.stringify({
      explanation: "재고를 담아요.",
      grounded: false,
      mentionedTables: [],
      pros: "좋아요",
      cons: [1, " 남는 항목 ", null],
    })
    const r = parseDbNote(text, known)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect("pros" in r.value).toBe(false)
      expect(r.value.cons).toEqual(["남는 항목"])
    }
  })

  it("3개 초과는 3개로 자른다", () => {
    const text = JSON.stringify({
      explanation: "재고를 담아요.",
      grounded: false,
      mentionedTables: [],
      pros: ["하나", "둘", "셋", "넷", "다섯"],
    })
    const r = parseDbNote(text, known)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.pros).toEqual(["하나", "둘", "셋"])
  })
})

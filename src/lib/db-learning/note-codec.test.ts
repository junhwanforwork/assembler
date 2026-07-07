import { describe, it, expect } from "vitest"
import { encodeNoteExplanation, decodeNoteExplanation } from "./note-codec"

// ASM-057 — 노트 구조화의 저장 경계. asm_db_table_notes.explanation 은 text 단일 컬럼(마이그레이션 금지)이라
// pros/cons 가 있을 때만 JSON 봉투로 실어 나른다. 구형 단문·사용자 편집 평문은 그대로 통과해야 한다.

describe("encodeNoteExplanation", () => {
  it("pros/cons가 있으면 JSON 봉투로 인코딩한다", () => {
    const encoded = encodeNoteExplanation({
      explanation: "산책 기록을 담아요.",
      pros: ["기록이 한 곳에 모여요."],
      cons: ["담당자 정보는 없어요."],
    })
    expect(JSON.parse(encoded)).toEqual({
      v: 1,
      summary: "산책 기록을 담아요.",
      pros: ["기록이 한 곳에 모여요."],
      cons: ["담당자 정보는 없어요."],
    })
  })

  it("구조가 없으면 평문 그대로 반환한다(구형 호환)", () => {
    expect(encodeNoteExplanation({ explanation: "산책 기록을 담아요." })).toBe("산책 기록을 담아요.")
    expect(encodeNoteExplanation({ explanation: "산책 기록을 담아요.", pros: [], cons: [] })).toBe("산책 기록을 담아요.")
  })
})

describe("decodeNoteExplanation", () => {
  it("봉투를 요약+pros/cons로 되돌린다(라운드트립)", () => {
    const note = { explanation: "산책 기록을 담아요.", pros: ["기록이 한 곳에 모여요."], cons: ["담당자 정보는 없어요."] }
    expect(decodeNoteExplanation(encodeNoteExplanation(note))).toEqual(note)
  })

  it("평문(구형 단문·사용자 편집)은 요약으로만 되돌린다", () => {
    expect(decodeNoteExplanation("산책 기록을 담아요.")).toEqual({ explanation: "산책 기록을 담아요." })
  })

  it("JSON이지만 봉투 형식이 아니면 평문 취급한다", () => {
    const text = JSON.stringify({ hello: "world" })
    expect(decodeNoteExplanation(text)).toEqual({ explanation: text })
  })

  it("{로 시작하는 깨진 JSON도 평문 취급한다", () => {
    expect(decodeNoteExplanation("{산책 기록이에요}")).toEqual({ explanation: "{산책 기록이에요}" })
  })

  it("봉투인데 summary가 비면 평문 취급한다(빈 설명 방출 금지)", () => {
    const text = JSON.stringify({ v: 1, summary: "  ", pros: ["좋아요"] })
    expect(decodeNoteExplanation(text)).toEqual({ explanation: text })
  })

  it("봉투 안 비문자열·공백 항목은 걸러낸다", () => {
    const text = JSON.stringify({ v: 1, summary: "산책 기록을 담아요.", pros: [1, " 항목 ", ""], cons: [] })
    expect(decodeNoteExplanation(text)).toEqual({ explanation: "산책 기록을 담아요.", pros: ["항목"] })
  })

  // 통합 정정(2026-07-08): 읽기 경계도 3개 클램프 — DB 직접 조작·미래 writer 경유분 방어.
  it("봉투 안 항목이 3개를 넘으면 앞 3개만 남긴다", () => {
    const text = JSON.stringify({ v: 1, summary: "요약이에요.", pros: ["a", "b", "c", "d", "e"] })
    expect(decodeNoteExplanation(text)).toEqual({ explanation: "요약이에요.", pros: ["a", "b", "c"] })
  })
})

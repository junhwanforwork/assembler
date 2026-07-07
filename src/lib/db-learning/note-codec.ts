// ASM-057 — 노트 구조화(요약+좋은 점/주의할 점)의 저장 경계.
// asm_db_table_notes.explanation 은 text 단일 컬럼이고 스키마 변경은 금지라, 구조가 있을 때만
// JSON 봉투({v:1, summary, pros?, cons?})로 실어 나른다. 구형 단문 노트·사용자 편집 평문은 그대로 통과.
// 디코드는 관용: 봉투가 아니면(평문·타 JSON·깨진 JSON) 전체를 요약으로 취급해 절대 내용을 잃지 않는다.

export type StructuredNote = { explanation: string; pros?: string[]; cons?: string[] }

const ENVELOPE_VERSION = 1

export function encodeNoteExplanation(note: StructuredNote): string {
  const pros = note.pros ?? []
  const cons = note.cons ?? []
  if (pros.length === 0 && cons.length === 0) return note.explanation
  return JSON.stringify({
    v: ENVELOPE_VERSION,
    summary: note.explanation,
    ...(pros.length > 0 ? { pros } : {}),
    ...(cons.length > 0 ? { cons } : {}),
  })
}

function asPoints(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const items = v.map((item) => (typeof item === "string" ? item.trim() : "")).filter((item) => item.length > 0)
  return items.length > 0 ? items : undefined
}

export function decodeNoteExplanation(text: string): StructuredNote {
  if (!text.startsWith("{")) return { explanation: text }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { explanation: text }
  }
  if (typeof raw !== "object" || raw === null) return { explanation: text }
  const o = raw as Record<string, unknown>
  const summary = typeof o.summary === "string" ? o.summary.trim() : ""
  if (o.v !== ENVELOPE_VERSION || summary.length === 0) return { explanation: text }

  const pros = asPoints(o.pros)
  const cons = asPoints(o.cons)
  return { explanation: summary, ...(pros ? { pros } : {}), ...(cons ? { cons } : {}) }
}

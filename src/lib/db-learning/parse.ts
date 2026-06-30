import { extractJsonObject } from "@/lib/anthropic-json"
import type { Parsed } from "@/lib/api/validate"

// DB Learning 환각 방어 4층 — 엔티티 살균.
// AI가 설명에서 언급했다고 신고한 테이블명(mentionedTables)을 "허용 집합"(자기 자신 + 연결된 증거 테이블)과 대조한다.
// 연결 안 된/없는 테이블을 언급 = 환각 → hallucinated_table 로 거부(run.ts가 1회 재시도 후 보수 폴백).
//
// ⚠️ 한계(설계상 인지·미차단): 이 검사는 AI가 self-report 한 mentionedTables 와 "테이블명"만 본다.
//   본문(explanation) 산문에 담긴 비즈니스 맥락 환각("수리 기사 배정·부품 발주")이나, mentionedTables 에
//   누락한 채 본문에만 적은 테이블명은 기계적으로 못 잡는다. 그 잔여 위험의 백스톱은
//   프롬프트 iron_law + UI 'AI 추정' 배지 + 편집 가능(사람 검수)이다 — 코드가 막는다고 가정하지 말 것.

export type ParsedNote = { explanation: string; grounded: boolean }

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

export function parseDbNote(text: string, allowedTableNames: ReadonlySet<string>): Parsed<ParsedNote> {
  let raw: unknown
  try {
    raw = JSON.parse(extractJsonObject(text))
  } catch {
    return { ok: false, error: "invalid_json" }
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid_note" }
  const o = raw as Record<string, unknown>

  const explanation = asString(o.explanation).trim()
  if (explanation.length === 0) return { ok: false, error: "empty_explanation" }

  // 살균: 신고된 언급 테이블이 전부 허용 집합(연결된 증거) 안이어야 한다. 하나라도 밖이면 환각.
  const mentioned = Array.isArray(o.mentionedTables) ? o.mentionedTables : []
  for (const m of mentioned) {
    const name = asString(m).trim()
    if (name.length > 0 && !allowedTableNames.has(name)) return { ok: false, error: "hallucinated_table" }
  }

  return { ok: true, value: { explanation, grounded: o.grounded === true } }
}

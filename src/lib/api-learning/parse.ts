import { extractJsonObject } from "@/lib/anthropic-json"
import type { Parsed } from "@/lib/api/validate"

// API 해석(ASM-064) 환각 방어 — 엔티티 살균(db-learning parse 원리).
// AI가 신고한 언급 이름(mentionedNames — 기능·테이블)을 증거 화이트리스트와 대조한다.
// 연결 안 된/없는 이름 언급 = 환각 → hallucinated_name 거부(run이 1회 재시도 후 보수 폴백).
//
// ⚠️ 한계(설계상 인지·미차단): self-report 기반이라 본문 산문에만 담긴 환각은 기계적으로 못 잡는다.
//   잔여 위험의 백스톱은 프롬프트 iron_law + UI 'AI 추정' 배지 + 편집 가능(사람 검수)이다.

export type ParsedApiNote = { explanation: string; grounded: boolean; pros?: string[]; cons?: string[] }

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

// 상한 3개는 프롬프트 유도 + 하드 클램프(structured outputs가 maxItems 미지원).
const MAX_POINTS = 3

function asPoints(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const items = v
    .map((item) => asString(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, MAX_POINTS)
  return items.length > 0 ? items : undefined
}

export function parseApiNote(text: string, allowedNames: ReadonlySet<string>): Parsed<ParsedApiNote> {
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

  // 살균: 신고된 언급 이름이 전부 허용 집합(연결된 증거) 안이어야 한다. 하나라도 밖이면 환각.
  const mentioned = Array.isArray(o.mentionedNames) ? o.mentionedNames : []
  for (const m of mentioned) {
    const name = asString(m).trim()
    if (name.length > 0 && !allowedNames.has(name)) return { ok: false, error: "hallucinated_name" }
  }

  const pros = asPoints(o.pros)
  const cons = asPoints(o.cons)
  return {
    ok: true,
    value: {
      explanation,
      grounded: o.grounded === true,
      ...(pros ? { pros } : {}),
      ...(cons ? { cons } : {}),
    },
  }
}

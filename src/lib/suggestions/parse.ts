import type { Suggestion, SuggestionKind, SuggestionTargetType, WorkspaceDesign } from "@/lib/types/assembler"
import { extractJsonObject } from "@/lib/anthropic-json"
import type { Parsed } from "@/lib/api/validate"

const KINDS: ReadonlySet<string> = new Set([
  "missing_api",
  "missing_db",
  "orphan_object",
  "missing_acceptance",
  "gap",
  "improvement",
])
const TARGET_TYPES: ReadonlySet<string> = new Set(["requirement", "feature", "page", "flow", "element"])

// id → 실제 객체 타입. 살균 시 targetId 존재 + targetType 일치까지 강제한다
// (generate의 per-type sanitizeCodeTruthRefs 규율과 동일 — 엉뚱한 타입을 가리키는 참조도 dangling).
function idTypeMap(design: WorkspaceDesign): Map<string, SuggestionTargetType> {
  const map = new Map<string, SuggestionTargetType>()
  for (const r of design.requirements) map.set(r.id, "requirement")
  for (const f of design.features) map.set(f.id, "feature")
  for (const p of design.pages) map.set(p.id, "page")
  for (const fl of design.flows) map.set(fl.id, "flow")
  for (const e of design.elements) map.set(e.id, "element")
  return map
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

// AI 출력 → 검증·살균된 Suggestion[]. targetId 는 현존 객체이거나 null(dangling 0).
export function parseSuggestions(text: string, design: WorkspaceDesign): Parsed<Suggestion[]> {
  let raw: unknown
  try {
    raw = JSON.parse(extractJsonObject(text))
  } catch {
    return { ok: false, error: "invalid_json" }
  }

  const list = (raw as { suggestions?: unknown })?.suggestions
  if (!Array.isArray(list)) return { ok: false, error: "invalid_suggestions" }

  const idTypes = idTypeMap(design)
  const out: Suggestion[] = []

  list.forEach((item, i) => {
    if (typeof item !== "object" || item === null) return
    const o = item as Record<string, unknown>
    const kind = asString(o.kind)
    const title = asString(o.title).trim()
    const detail = asString(o.detail).trim()
    if (!KINDS.has(kind) || title.length === 0) return // 종류 불명·제목 없음 = 버린다.

    // 참조 살균 — id가 현존하고 그 객체의 실제 타입이 targetType과 일치할 때만 채택.
    // 불일치·미존재면 둘 다 null(엉뚱한 타입을 가리키는 dangling 방지).
    const rawTargetId = asString(o.targetId)
    const rawTargetType = asString(o.targetType)
    const actualType = idTypes.get(rawTargetId)
    const matches = actualType !== undefined && actualType === rawTargetType && TARGET_TYPES.has(rawTargetType)
    const targetId = matches ? rawTargetId : null
    const targetType: SuggestionTargetType | null = matches ? (rawTargetType as SuggestionTargetType) : null

    out.push({ id: `sug-${i}`, kind: kind as SuggestionKind, title, detail, targetType, targetId })
  })

  return { ok: true, value: out }
}

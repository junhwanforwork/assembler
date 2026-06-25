// Clarify 질문지 정규화 (ASS-209) — /api/clarify 의 LLM 원본(unknown)을 UI가 믿을 수 있는
// ClarifyQuestionnaire 로 보정한다. structured outputs 로 형태는 보장되지만, 문항/선택지 수·
// slider range·중복 id 같은 "의미" 제약은 여기서 강제한다. 비정상은 빈 questionnaire(=brief skip,
// ProjectListClient 가 바로-생성 폴백). normalizeGraph 패턴 차용.

import { asArray, asOptString, asRecord, asString } from "@/lib/graph/normalize-entities"
import type {
  ClarifyKind,
  ClarifyOption,
  ClarifyQuestion,
  ClarifyQuestionnaire,
} from "@/lib/types/clarify"

const QUESTION_MIN = 3
const QUESTION_MAX = 6
const OPTION_MIN = 2
const OPTION_MAX = 6
const KINDS: ClarifyKind[] = ["single", "multi", "slider", "text"]

export function normalizeQuestionnaire(input: unknown): ClarifyQuestionnaire {
  const root = asRecord(input)
  const seenIds = new Set<string>()
  const questions: ClarifyQuestion[] = []

  for (const raw of asArray(root.questions)) {
    if (questions.length >= QUESTION_MAX) break
    const q = normQuestion(raw, questions.length, seenIds)
    if (q) questions.push(q)
  }

  // 최소 문항 미달 = 신뢰 불가 → 빈 질문지(brief skip).
  if (questions.length < QUESTION_MIN) return { questions: [] }
  return { questions }
}

function normQuestion(raw: unknown, index: number, seenIds: Set<string>): ClarifyQuestion | null {
  const r = asRecord(raw)
  const kind = asKind(r.kind)
  const title = asString(r.title, "").trim()
  if (!kind || !title) return null

  const base: ClarifyQuestion = {
    id: uniqueId(asString(r.id, ""), index, seenIds),
    kind,
    title,
    hint: asOptString(r.hint),
    allowDecideForMe: r.allowDecideForMe !== false, // 기본 노출
    allowOther: r.allowOther === true,
  }

  if (kind === "single" || kind === "multi") {
    const options = normOptions(r.options)
    if (options.length < OPTION_MIN) return null // 선택지 부족 = 무효
    return { ...base, options }
  }
  if (kind === "slider") {
    const range = normRange(r.range)
    if (!range) return null
    return { ...base, range }
  }
  return base // text — options/range 없음
}

function asKind(v: unknown): ClarifyKind | null {
  return KINDS.includes(v as ClarifyKind) ? (v as ClarifyKind) : null
}

function uniqueId(raw: string, index: number, seenIds: Set<string>): string {
  const base = raw.trim() || `q${index + 1}`
  let id = base
  let n = 2
  while (seenIds.has(id)) id = `${base}-${n++}`
  seenIds.add(id)
  return id
}

function normOptions(v: unknown): ClarifyOption[] {
  const out: ClarifyOption[] = []
  const seen = new Set<string>()
  for (const raw of asArray(v)) {
    if (out.length >= OPTION_MAX) break
    const r = asRecord(raw)
    const label = asString(r.label, "").trim()
    const value = asString(r.value, "").trim() || label
    if (!label || seen.has(value)) continue
    seen.add(value)
    out.push({ value, label, description: asOptString(r.description) })
  }
  return out
}

function normRange(v: unknown): ClarifyQuestion["range"] | null {
  const r = asRecord(v)
  const min = asFiniteNumber(r.min)
  const max = asFiniteNumber(r.max)
  if (min === null || max === null || min >= max) return null
  const step = asFiniteNumber(r.step)
  const def = clamp(asFiniteNumber(r.default) ?? Math.round((min + max) / 2), min, max)
  return { min, max, step: step && step > 0 ? step : undefined, default: def }
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

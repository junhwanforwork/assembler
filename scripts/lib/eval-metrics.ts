// 생성 품질 점수 — 북극성 메트릭 (ASS-062). 순수 함수, 라이브 호출 없음.
// 골든 그래프는 정의상 1.0 이 나와야 한다(= 메트릭 자가 단위테스트 — verify-goldenset.ts).
// 두 계열: normalizeHealth(모델이 normalize가 안 고쳐도 되는 깨끗한 그래프를 냈나) + coverage(골든 대비 완성도).
// 도메인 규칙·normalize는 읽기만 한다(프롬프트 부서 경계 — docs/specs/prompt-department.md).

import type { ProjectGraph, UIElementType } from "@/lib/types/assembler"
import { UI_ELEMENT_TYPES } from "@/lib/types/assembler"
import { NEEDS_REVIEW } from "@/lib/graph/normalize-entities"
import { elementsOfPage, isMappingComplete, requirementFeatures } from "@/lib/graph/selectors"

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

// --- normalize 정합 검증(verify-goldenset.ts 공유) — 골든=정답이면 0 이어야 함 ---

/** normalize 후 "확인 필요" 마커가 붙은 위치 목록. 고립·dangling-navigate·missing wireframe·edge 불일치·잘못된 method 포함. */
export function countMarkers(g: ProjectGraph): string[] {
  const hits: string[] = []
  const probe = (where: string, text: string): void => {
    if (text.startsWith(NEEDS_REVIEW)) hits.push(where)
  }
  for (const r of g.requirements) probe(`requirement ${r.id}`, r.description)
  for (const p of g.pages) probe(`page ${p.id}`, p.description)
  for (const el of g.uiElements) probe(`element ${el.id}`, el.description)
  for (const a of g.apis) probe(`api ${a.id}`, a.purpose)
  for (const d of g.databases) probe(`database ${d.id}`, d.purpose)
  for (const e of g.userFlow.edges) if (e.condition?.startsWith(NEEDS_REVIEW)) hits.push(`edge ${e.id}`)
  return hits
}

/** 배열 id 참조 총합 — normalize가 dangling·중복을 제거하면 줄어든다. 측정 단위는 verify-goldenset.ts와 동일. */
export function arrayRefTotal(g: ProjectGraph): number {
  let n = 0
  for (const f of g.features) n += f.requirementIds.length + f.pageIds.length + f.apiIds.length + f.databaseIds.length
  for (const p of g.pages) n += p.featureIds.length + p.apiIds.length + p.databaseIds.length
  for (const w of g.wireframes) n += w.uiElementIds.length
  for (const el of g.uiElements) n += el.apiIds.length + el.databaseIds.length
  for (const a of g.apis) n += a.databaseIds.length
  return n
}

// --- raw(파싱 직후 unknown) 방어적 측정 — silent 보정(중복/dangling 참조·잘못된 enum) 포착 ---

function asRec(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}
function refLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0
}

// arrayRefTotal과 같은 필드를 raw에서 센다 — 차이가 곧 normalize가 제거한 참조 수(dangling + 중복).
function rawArrayRefTotal(raw: unknown): number {
  const r = asRec(raw)
  let n = 0
  for (const f of asArr(r.features)) {
    const o = asRec(f)
    n += refLen(o.requirementIds) + refLen(o.pageIds) + refLen(o.apiIds) + refLen(o.databaseIds)
  }
  for (const p of asArr(r.pages)) {
    const o = asRec(p)
    n += refLen(o.featureIds) + refLen(o.apiIds) + refLen(o.databaseIds)
  }
  for (const w of asArr(r.wireframes)) n += refLen(asRec(w).uiElementIds)
  for (const el of asArr(r.uiElements)) {
    const o = asRec(el)
    n += refLen(o.apiIds) + refLen(o.databaseIds)
  }
  for (const a of asArr(r.apis)) n += refLen(asRec(a).databaseIds)
  return n
}

const RESULT_KINDS = new Set(["navigate", "stateChange", "toast", "inlineError", "none"])

// 잘못된 enum 값을 명시적으로 넣은 경우만 센다(누락은 정상 기본값이라 제외). method 오류는 normalize가 마커로 남겨 markerCount에 잡힘 — 여기선 silent한 type·result.kind만.
function silentEnumCoercion(raw: unknown): number {
  const types = new Set<string>(UI_ELEMENT_TYPES)
  let n = 0
  for (const el of asArr(asRec(raw).uiElements)) {
    const o = asRec(el)
    if (typeof o.type === "string" && !types.has(o.type)) n++
    const kind = asRec(o.result).kind
    if (typeof kind === "string" && !RESULT_KINDS.has(kind)) n++
  }
  return n
}

function countAutoEdges(g: ProjectGraph): number {
  return g.userFlow.edges.filter((e) => e.id.startsWith("edge-gen-")).length
}

export type FixSignals = {
  markerCount: number
  refsPruned: number
  edgesAutoCreated: number
  enumCoercion: number
  total: number
}

/** raw(모델 원본) ↔ normalized(보정 후) 차이로 "원본이 얼마나 더러웠나"를 센다. 골든=정답이면 전부 0. */
export function extractFixSignals(rawParsed: unknown, normalized: ProjectGraph): FixSignals {
  const markerCount = countMarkers(normalized).length // 고립·navigate-dangling·method 오류 등 포함(중복 합산 방지로 orphan 별도 미가산)
  const refsPruned = Math.max(0, rawArrayRefTotal(rawParsed) - arrayRefTotal(normalized))
  const edgesAutoCreated = countAutoEdges(normalized)
  const enumCoercion = silentEnumCoercion(rawParsed)
  return { markerCount, refsPruned, edgesAutoCreated, enumCoercion, total: markerCount + refsPruned + edgesAutoCreated + enumCoercion }
}

// --- coverage — 같은 아이디어의 골든 그래프 대비 ---

const INTERACTIVE = new Set<UIElementType>(["button", "text-input", "textarea", "dropdown", "toggle", "number-stepper"])

// 컬렉션별 개수 비율(과생성은 1로 캡 — orphan 부풀리기는 markerCount가 따로 벌점). 골든 분모 0은 발생 안 하나 방어.
function countScore(g: ProjectGraph, gold: ProjectGraph): number {
  const pairs: [number, number][] = [
    [g.requirements.length, gold.requirements.length],
    [g.features.length, gold.features.length],
    [g.pages.length, gold.pages.length],
    [g.uiElements.length, gold.uiElements.length],
    [g.apis.length, gold.apis.length],
    [g.databases.length, gold.databases.length],
  ]
  const ratios = pairs.map(([a, b]) => (b === 0 ? 1 : clamp01(a / b)))
  return ratios.reduce((s, x) => s + x, 0) / ratios.length
}

// 인터랙티브 요소 중 매핑 완성 비율 — 앱 단일 출처 isMappingComplete 그대로(사이드바 뱃지와 동일 기준). 인터랙티브 0개 = 비제품 그래프 → 0.
function mappingCompleteness(g: ProjectGraph): number {
  const interactive = g.uiElements.filter((el) => INTERACTIVE.has(el.type))
  if (interactive.length === 0) return 0
  return interactive.filter(isMappingComplete).length / interactive.length
}

// Requirement→Feature→Page→UIElement→Api→Database 완전 체인이 하나라도 있나(연결된 제품 그래프의 핵심 신호).
function chainPresence(g: ProjectGraph): number {
  const featById = new Map(g.features.map((f) => [f.id, f]))
  const apiById = new Map(g.apis.map((a) => [a.id, a]))
  for (const r of g.requirements) {
    for (const fid of requirementFeatures(g, r.id)) {
      const f = featById.get(fid)
      if (!f) continue
      for (const pid of f.pageIds) {
        for (const el of elementsOfPage(g, pid)) {
          for (const aid of el.apiIds) {
            if ((apiById.get(aid)?.databaseIds.length ?? 0) > 0) return 1
          }
        }
      }
    }
  }
  return 0
}

// --- 하드 무결성 게이트(점수와 별개, 0이어야 PASS) ---
function hardIntegrity(g: ProjectGraph): string[] {
  const v: string[] = []
  const pageIds = new Set(g.pages.map((p) => p.id))
  const wfIds = new Set(g.wireframes.map((w) => w.id))
  const danglingWf = g.pages.filter((p) => !wfIds.has(p.wireframeId)).length
  const danglingEdge = g.userFlow.edges.filter((e) => !pageIds.has(e.fromPageId) || !pageIds.has(e.toPageId)).length
  if (danglingWf > 0) v.push(`dangling wireframe ref: ${danglingWf}`)
  if (danglingEdge > 0) v.push(`dangling userFlow edge: ${danglingEdge}`)
  if (g.pages.length === 0) v.push("empty pages")
  if (g.uiElements.length === 0) v.push("empty uiElements")
  return v
}

export type ScoreResult = {
  qualityScore: number
  coverage: number
  normalizeHealth: number
  sub: { countScore: number; mappingCompleteness: number; chainPresence: number; fixSignals: FixSignals }
  hardViolations: string[]
}

/** 생성 그래프(normalize 후) + 같은 아이디어의 골든 + fix 신호 → 0..1 품질 점수. */
export function scoreGraph(generated: ProjectGraph, golden: ProjectGraph, signals: FixSignals): ScoreResult {
  const cScore = countScore(generated, golden)
  const mComplete = mappingCompleteness(generated)
  const chain = chainPresence(generated)
  const coverage = 0.45 * cScore + 0.4 * mComplete + 0.15 * chain

  const budget = Math.max(8, Math.round(0.5 * generated.uiElements.length))
  const normalizeHealth = 1 - clamp01(signals.total / budget)

  const qualityScore = 0.55 * coverage + 0.45 * normalizeHealth
  return {
    qualityScore,
    coverage,
    normalizeHealth,
    sub: { countScore: cScore, mappingCompleteness: mComplete, chainPresence: chain, fixSignals: signals },
    hardViolations: hardIntegrity(generated),
  }
}

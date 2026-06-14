// 엔티티별 정규화 — unknown(파싱 직후) → 타입 객체. ProjectGraph 캐스팅 금지(좁히기로만).
// "확인 필요"는 content-style.md 마커 — 별도 필드 신설 없이 사람 읽는 텍스트 필드에 인라인.
// id 누락은 마커가 아니라 생성 id(`prefix-index`)로 — 마커 문자열을 id로 쓰면 충돌·참조 깨짐.
// cross-cutting(dangling·navigate↔edge·orphan)은 normalize.ts 가 담당.

import type {
  Api,
  Database,
  Feature,
  Page,
  PageFlow,
  PageFlowStep,
  Requirement,
  UIElement,
  UIElementResult,
  UIElementState,
  UserFlow,
  UserFlowEdge,
  Wireframe,
} from "@/lib/types/assembler"
import { API_METHODS, PAGE_DEVICES, UI_ELEMENT_TYPES } from "@/lib/types/assembler"
import type { PageDevice } from "@/lib/types/assembler"

export const NEEDS_REVIEW = "확인 필요"

const UI_TYPES = new Set<string>(UI_ELEMENT_TYPES)
const METHODS = new Set<string>(API_METHODS)
const DEVICES = new Set<string>(PAGE_DEVICES)

// device 누락·불량 → mobile (x/y와 동일 — 표현 필드, AI 미생성).
function asDevice(v: unknown): PageDevice {
  return typeof v === "string" && DEVICES.has(v) ? (v as PageDevice) : "mobile"
}

export function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export function asString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback
}

export function asOptString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined
}

export function asStringArray(v: unknown): string[] {
  return asArray(v).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

function asId(v: unknown, prefix: string, index: number): string {
  return asOptString(v) ?? `${prefix}-${index}`
}

export function normRequirement(raw: unknown, i: number): Requirement {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "req", i),
    title: asString(r.title, NEEDS_REVIEW),
    description: asString(r.description, NEEDS_REVIEW),
  }
}

export function normFeature(raw: unknown, i: number): Feature {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "feat", i),
    name: asString(r.name, NEEDS_REVIEW),
    description: asString(r.description, NEEDS_REVIEW),
    businessRules: asStringArray(r.businessRules),
    requirementIds: asStringArray(r.requirementIds),
    pageIds: asStringArray(r.pageIds),
    apiIds: asStringArray(r.apiIds),
    databaseIds: asStringArray(r.databaseIds),
  }
}

export function normPage(raw: unknown, i: number): Page {
  const r = asRecord(raw)
  // x/y 누락 시 그리드 기본 배치 (3열) — AI 미생성(ASS-015).
  const page: Page = {
    id: asId(r.id, "page", i),
    name: asString(r.name, NEEDS_REVIEW),
    description: asString(r.description, NEEDS_REVIEW),
    featureIds: asStringArray(r.featureIds),
    wireframeId: asString(r.wireframeId, NEEDS_REVIEW),
    apiIds: asStringArray(r.apiIds),
    databaseIds: asStringArray(r.databaseIds),
    x: asNumber(r.x) ?? (i % 3) * 320,
    y: asNumber(r.y) ?? Math.floor(i / 3) * 360,
    device: asDevice(r.device),
  }
  const pageFlowId = asOptString(r.pageFlowId)
  if (pageFlowId !== undefined) page.pageFlowId = pageFlowId
  return page
}

export function normWireframe(raw: unknown, i: number): Wireframe {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "wf", i),
    pageId: asString(r.pageId, NEEDS_REVIEW),
    uiElementIds: asStringArray(r.uiElementIds),
  }
}

function normState(raw: unknown): UIElementState {
  const r = asRecord(raw)
  const state: UIElementState = { label: asString(r.label, NEEDS_REVIEW) }
  const detail = asOptString(r.detail)
  if (detail !== undefined) state.detail = detail
  return state
}

// result.kind ∉ 5종 → none. navigate 인데 toPageId 누락 → none 강등(존재하나 불일치는 dangling 패스가 마킹).
function normResult(raw: unknown): UIElementResult {
  const r = asRecord(raw)
  const kind = typeof r.kind === "string" ? r.kind : "none"
  if (kind === "navigate") {
    const toPageId = asOptString(r.toPageId)
    if (toPageId === undefined) return { kind: "none" }
    const detail = asOptString(r.detail)
    return detail !== undefined ? { kind: "navigate", toPageId, detail } : { kind: "navigate", toPageId }
  }
  if (kind === "stateChange" || kind === "toast" || kind === "inlineError") {
    return { kind, detail: asString(r.detail, NEEDS_REVIEW) }
  }
  return { kind: "none" }
}

export function normUIElement(raw: unknown, i: number): UIElement {
  const r = asRecord(raw)
  // type ∉ 10종 → text 폴백(BlockRenderer assertNever 크래시 방지, ASS-013).
  const type = typeof r.type === "string" && UI_TYPES.has(r.type) ? (r.type as UIElement["type"]) : "text"
  return {
    id: asId(r.id, "el", i),
    name: asString(r.name, NEEDS_REVIEW),
    description: asString(r.description, NEEDS_REVIEW),
    type,
    props: asRecord(r.props),
    states: asArray(r.states).map(normState),
    action: asString(r.action, NEEDS_REVIEW),
    apiIds: asStringArray(r.apiIds),
    databaseIds: asStringArray(r.databaseIds),
    result: normResult(r.result),
  }
}

export function normApi(raw: unknown, i: number): Api {
  const r = asRecord(raw)
  // method 대문자 정규화 후 매칭. 불일치 시 묵살 폴백 금지 — GET 폴백 + purpose 마킹(delete→GET 둔갑 방지, ASS-014).
  const upper = typeof r.method === "string" ? r.method.toUpperCase() : ""
  const valid = METHODS.has(upper)
  const method = (valid ? upper : "GET") as Api["method"]
  const purpose = asString(r.purpose, NEEDS_REVIEW)
  return {
    id: asId(r.id, "api", i),
    method,
    path: asString(r.path, NEEDS_REVIEW),
    purpose: valid ? purpose : `${NEEDS_REVIEW} — ${purpose}`,
    databaseIds: asStringArray(r.databaseIds),
    success: asString(r.success, NEEDS_REVIEW),
    error: asString(r.error, NEEDS_REVIEW),
  }
}

export function normDatabase(raw: unknown, i: number): Database {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "db", i),
    name: asString(r.name, NEEDS_REVIEW),
    purpose: asString(r.purpose, NEEDS_REVIEW),
    columns: asStringArray(r.columns),
  }
}

function normPageFlowStep(raw: unknown, i: number): PageFlowStep {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "step", i),
    label: asString(r.label, NEEDS_REVIEW),
    nextStepIds: asStringArray(r.nextStepIds),
  }
}

export function normPageFlow(raw: unknown, i: number): PageFlow {
  const r = asRecord(raw)
  return {
    id: asId(r.id, "pf", i),
    pageId: asString(r.pageId, NEEDS_REVIEW),
    steps: asArray(r.steps).map(normPageFlowStep),
  }
}

function normUserFlowEdge(raw: unknown, i: number): UserFlowEdge {
  const r = asRecord(raw)
  const edge: UserFlowEdge = {
    id: asId(r.id, "edge", i),
    fromPageId: asString(r.fromPageId, NEEDS_REVIEW),
    toPageId: asString(r.toPageId, NEEDS_REVIEW),
  }
  const trigger = asOptString(r.triggerElementId)
  if (trigger !== undefined) edge.triggerElementId = trigger
  const condition = asOptString(r.condition)
  if (condition !== undefined) edge.condition = condition
  return edge
}

// userFlow 누락 시 빈 UserFlow(id 생성, edges: []) — optional 제3상태 방지(ASS-015).
export function normUserFlow(raw: unknown): UserFlow {
  const r = asRecord(raw)
  return { id: asId(r.id, "userflow", 0), edges: asArray(r.edges).map(normUserFlowEdge) }
}

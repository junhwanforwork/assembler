import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp, DesignCollectionKey } from "@/lib/types/chat"
import { COLLECTION_LABEL, resolveItemName } from "./designNames"

// 변경 계획 op 하나의 payload를 사람이 읽는 diff 행으로 — 도크 표시 전용(적용 로직과 무관).
// ASM-047: 승인 결정 표면이라 모델 내부 언어(raw 필드명·id·JSON)를 노출하지 않는다.
// WorkspaceDesign 필드는 유한집합 — FIELD_SPECS로 라벨·포맷을 매핑하고,
// 맵에 없는 미지 필드는 raw 폴백으로 살린다(침묵 실종 금지 — 정직 원칙).

export type PlanOpDiff = {
  kind: "added" | "removed" | "changed"
  field: string
  label: string
  before?: string
  after?: string
}

const MAX_VALUE_LENGTH = 120
const EMPTY_VALUE = "없음"

function truncate(text: string): string {
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text
}

function fmtRaw(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value)
  return raw ?? ""
}

type ValueFormat = (value: unknown, design: WorkspaceDesign) => string

// id 배열 → 이름 목록. dangling은 raw id 대신 "이름 없는 X" — 개수는 보존한다.
function idListFormat(collection: DesignCollectionKey): ValueFormat {
  return (value, design) => {
    if (!Array.isArray(value)) return fmtRaw(value)
    if (value.length === 0) return EMPTY_VALUE
    return value
      .map((id) =>
        (typeof id === "string" ? resolveItemName(design, collection, id) : null) ??
        `이름 없는 ${COLLECTION_LABEL[collection]}`,
      )
      .join(", ")
  }
}

// api·db id는 design(저작 그래프)에 이름이 없다(code-truth 전역) — 개수만 정직하게.
function countFormat(unit: string): ValueFormat {
  return (value) => {
    if (!Array.isArray(value)) return fmtRaw(value)
    return value.length === 0 ? EMPTY_VALUE : `${unit} ${value.length}개`
  }
}

// 객체 배열(detailFeatures·states) → 대표 필드 목록.
function titleListFormat(pick: string): ValueFormat {
  return (value) => {
    if (!Array.isArray(value)) return fmtRaw(value)
    if (value.length === 0) return EMPTY_VALUE
    return value
      .map((item) => {
        const title = (item as Record<string, unknown> | null)?.[pick]
        return typeof title === "string" ? title : "이름 없는 항목"
      })
      .join(", ")
  }
}

const stringListFormat: ValueFormat = (value) => {
  if (!Array.isArray(value)) return fmtRaw(value)
  if (value.length === 0) return EMPTY_VALUE
  return value.map((item) => (typeof item === "string" ? item : fmtRaw(item))).join(", ")
}

function enumFormat(labels: Record<string, string>): ValueFormat {
  // 미지 enum 값은 raw로 — 새 값이 침묵 실종되면 안 된다.
  return (value) => (typeof value === "string" ? (labels[value] ?? value) : fmtRaw(value))
}

const wireframeRefFormat: ValueFormat = (value, design) => {
  if (value === null) return EMPTY_VALUE
  if (typeof value !== "string") return fmtRaw(value)
  return resolveItemName(design, "wireframes", value) ?? "이름 없는 와이어프레임"
}

// Flow edges → "출발 → 도착" 목록(트리거는 op summary가 말한다).
const edgesFormat: ValueFormat = (value, design) => {
  if (!Array.isArray(value)) return fmtRaw(value)
  if (value.length === 0) return EMPTY_VALUE
  const pageName = (id: unknown) =>
    (typeof id === "string" ? resolveItemName(design, "pages", id) : null) ?? "이름 없는 페이지"
  return value
    .map((edge) => {
      const e = edge as Record<string, unknown> | null
      if (!e) return fmtRaw(edge)
      return `${pageName(e.fromPageId)} → ${pageName(e.toPageId)}`
    })
    .join(", ")
}

const STATUS_LABEL: Record<string, string> = { draft: "초안", approved: "승인", deprecated: "폐기" }
const PRIORITY_LABEL: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" }

type FieldSpec = { label: string; format?: ValueFormat }

const FIELD_SPECS: Record<DesignCollectionKey, Record<string, FieldSpec>> = {
  requirements: {
    title: { label: "제목" },
    description: { label: "설명" },
    status: { label: "상태", format: enumFormat(STATUS_LABEL) },
    priority: { label: "우선순위", format: enumFormat(PRIORITY_LABEL) },
    role: { label: "역할" },
    acceptanceCriteria: { label: "완료 조건", format: stringListFormat },
  },
  features: {
    name: { label: "이름" },
    description: { label: "설명" },
    detailFeatures: { label: "세부 기능", format: titleListFormat("title") },
    requirementIds: { label: "연결된 요구사항", format: idListFormat("requirements") },
    pageIds: { label: "연결된 페이지", format: idListFormat("pages") },
    apiIds: { label: "연결된 API", format: countFormat("API") },
  },
  pages: {
    name: { label: "이름" },
    description: { label: "설명" },
    wireframeId: { label: "와이어프레임", format: wireframeRefFormat },
  },
  flows: {
    name: { label: "이름" },
    edges: { label: "이동 경로", format: edgesFormat },
  },
  wireframes: {
    elementIds: { label: "구성 요소", format: idListFormat("elements") },
  },
  elements: {
    label: { label: "이름" },
    type: { label: "종류" },
    action: { label: "동작" },
    states: { label: "상태", format: titleListFormat("name") },
    result: { label: "결과" },
    apiIds: { label: "연결된 API", format: countFormat("API") },
    dbTableIds: { label: "연결된 DB 테이블", format: countFormat("DB 테이블") },
  },
}

function fieldLabel(collection: DesignCollectionKey, field: string): string {
  return FIELD_SPECS[collection][field]?.label ?? field
}

function fmtField(
  collection: DesignCollectionKey,
  field: string,
  value: unknown,
  design: WorkspaceDesign,
): string {
  const format = FIELD_SPECS[collection][field]?.format
  return truncate(format ? format(value, design) : fmtRaw(value))
}

function findCurrent(op: ChangeOp, design: WorkspaceDesign): Record<string, unknown> | undefined {
  const rows = design[op.collection] as unknown as { id: string }[]
  return rows.find((item) => item.id === op.targetId) as Record<string, unknown> | undefined
}

// 지워질 항목은 필드 나열 대신 대표 필드(제목류) 하나만 — 무엇이 사라지는지만 보여준다.
const TITLE_FIELDS = ["title", "name", "label"] as const

export function diffOpPayload(op: ChangeOp, design: WorkspaceDesign): PlanOpDiff[] {
  if (op.action === "add") {
    if (!op.payload) return []
    return Object.entries(op.payload)
      .filter(([field]) => field !== "id")
      .map(([field, value]) => ({
        kind: "added" as const,
        field,
        label: fieldLabel(op.collection, field),
        after: fmtField(op.collection, field, value, design),
      }))
  }

  const current = findCurrent(op, design)
  if (!current) return [] // 대상 소실 — 도크는 summary만 보여주고 적용 시점 가드가 잡는다.

  if (op.action === "remove") {
    const field = TITLE_FIELDS.find((f) => typeof current[f] === "string")
    return field
      ? [
          {
            kind: "removed",
            field,
            label: fieldLabel(op.collection, field),
            before: fmtField(op.collection, field, current[field], design),
          },
        ]
      : []
  }

  if (!op.payload) return []
  const payload = op.payload
  const changed = Object.entries(payload)
    .filter(([field]) => field !== "id")
    .filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(current[field]))
    .map(([field, value]) => ({
      kind: "changed" as const,
      field,
      label: fieldLabel(op.collection, field),
      before: fmtField(op.collection, field, current[field], design),
      after: fmtField(op.collection, field, value, design),
    }))
  // update payload는 항목 "전체 교체"(apply.ts) — payload에 없는 현재 필드는 적용 시 사라진다.
  // 승인 관문이 파괴적 변경을 숨기면 안 되므로 removed 행으로 드러낸다.
  const removed = Object.keys(current)
    .filter((field) => field !== "id" && !(field in payload))
    .map((field) => ({
      kind: "removed" as const,
      field,
      label: fieldLabel(op.collection, field),
      before: fmtField(op.collection, field, current[field], design),
    }))
  return [...changed, ...removed]
}

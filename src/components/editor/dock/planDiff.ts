import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"

// 변경 계획 op 하나의 payload를 사람이 읽는 diff 행으로 — 도크 표시 전용(적용 로직과 무관).

export type PlanOpDiff = {
  kind: "added" | "removed" | "changed"
  field: string
  before?: string
  after?: string
}

const MAX_VALUE_LENGTH = 120

function fmt(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value)
  const text = raw ?? ""
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text
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
      .map(([field, value]) => ({ kind: "added" as const, field, after: fmt(value) }))
  }

  const current = findCurrent(op, design)
  if (!current) return [] // 대상 소실 — 도크는 summary만 보여주고 적용 시점 가드가 잡는다.

  if (op.action === "remove") {
    const field = TITLE_FIELDS.find((f) => typeof current[f] === "string")
    return field ? [{ kind: "removed", field, before: fmt(current[field]) }] : []
  }

  if (!op.payload) return []
  const payload = op.payload
  const changed = Object.entries(payload)
    .filter(([field]) => field !== "id")
    .filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(current[field]))
    .map(([field, value]) => ({
      kind: "changed" as const,
      field,
      before: fmt(current[field]),
      after: fmt(value),
    }))
  // update payload는 항목 "전체 교체"(apply.ts) — payload에 없는 현재 필드는 적용 시 사라진다.
  // 승인 관문이 파괴적 변경을 숨기면 안 되므로 removed 행으로 드러낸다.
  const removed = Object.keys(current)
    .filter((field) => field !== "id" && !(field in payload))
    .map((field) => ({ kind: "removed" as const, field, before: fmt(current[field]) }))
  return [...changed, ...removed]
}

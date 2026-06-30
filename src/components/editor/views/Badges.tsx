import { clsx } from "clsx"
import type { Priority, RequirementStatus } from "@/lib/types/assembler"
import s from "../editor.module.css"

// 상태 pill — tone에 따라 토큰 색. (positive/warning/negative soft)
export function StatusPill({ tone, label }: { tone: "active" | "draft" | "dep"; label: string }) {
  const cls = tone === "active" ? s.stActive : tone === "draft" ? s.stDraft : s.stDep
  return (
    <span className={clsx(s.status, cls)}>
      <span className={s.dot} />
      {label}
    </span>
  )
}

const REQ_STATUS: Record<RequirementStatus, { tone: "active" | "draft" | "dep"; label: string }> = {
  approved: { tone: "active", label: "승인됨" },
  draft: { tone: "draft", label: "작성중" },
  deprecated: { tone: "dep", label: "중단됨" },
}

export function RequirementStatusPill({ status }: { status: RequirementStatus }) {
  const { tone, label } = REQ_STATUS[status]
  return <StatusPill tone={tone} label={label} />
}

// 중요도 막대 3개 — high면 브랜드색.
export function PriorityBars({ priority }: { priority: Priority }) {
  return (
    <span className={clsx(s.prio, priority === "high" && s.prioHi)}>
      <i />
      <i />
      <i />
    </span>
  )
}

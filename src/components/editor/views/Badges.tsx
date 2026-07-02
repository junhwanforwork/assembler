import { clsx } from "clsx"
import type { Priority, RequirementStatus } from "@/lib/types/assembler"
import { Badge, type BadgeTone } from "@/components/ui/Badge"
import s from "../editor.module.css"

const STATUS_TONE: Record<"active" | "draft" | "dep", BadgeTone> = {
  active: "positive",
  draft: "warning",
  dep: "negative",
}

// 상태 pill — 도메인 tone(active/draft/dep)을 DS tone으로 매핑해 ui Badge에 위임.
export function StatusPill({ tone, label }: { tone: "active" | "draft" | "dep"; label: string }) {
  return (
    <Badge variant="status" tone={STATUS_TONE[tone]}>
      {label}
    </Badge>
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

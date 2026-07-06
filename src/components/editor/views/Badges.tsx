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

const PRIORITY_LEVEL: Record<Priority, number> = { low: 1, medium: 2, high: 3 }
const PRIORITY_LABEL: Record<Priority, string> = { low: "낮음", medium: "중간", high: "높음" }

// 중요도 막대 3개 — 채움 "개수"가 값(low 1·medium 2·high 3). 색 단독 지시 금지라 aria-label 동반,
// 브랜드색 대신 중성(high만 warning — 별(★) 강조와 같은 결).
export function PriorityBars({ priority }: { priority: Priority }) {
  const level = PRIORITY_LEVEL[priority]
  return (
    <span
      className={clsx(s.prio, priority === "high" && s.prioHi)}
      role="img"
      aria-label={`중요도 ${PRIORITY_LABEL[priority]}`}
    >
      {[1, 2, 3].map((n) => (
        <i key={n} className={clsx(n <= level && s.prioOn)} />
      ))}
    </span>
  )
}

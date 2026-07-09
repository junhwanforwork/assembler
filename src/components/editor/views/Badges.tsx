import { clsx } from "clsx"
import type {
  ChangeStatus,
  FeatureReviews,
  ImplStatus,
  Priority,
  RequirementStatus,
  ReviewRole,
  ReviewState,
} from "@/lib/types/assembler"
import { Badge, type BadgeTone } from "@/components/ui/Badge"
import {
  CHANGE_STATUS_LABEL,
  IMPL_STATUS_LABEL,
  REVIEW_ROLE_LABEL,
  REVIEW_STATE_LABEL,
} from "./specViewFormat"
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

// ── Storyboard 상태 배지(SW1 필드) — 라벨은 specViewFormat, tone만 여기서 매핑. status variant = dot pill. ──
const IMPL_TONE: Record<ImplStatus, BadgeTone> = {
  not_started: "neutral",
  in_progress: "warning",
  implemented: "positive",
  partial: "brand",
  unknown: "neutral",
}

export function ImplStatusPill({ status }: { status: ImplStatus }) {
  return (
    <Badge variant="status" tone={IMPL_TONE[status]}>
      {IMPL_STATUS_LABEL[status]}
    </Badge>
  )
}

const CHANGE_TONE: Record<ChangeStatus, BadgeTone> = {
  no_change: "neutral",
  changed: "warning",
  needs_review: "negative",
  confirmed: "positive",
}

export function ChangeStatusPill({ status }: { status: ChangeStatus }) {
  return (
    <Badge variant="status" tone={CHANGE_TONE[status]}>
      {CHANGE_STATUS_LABEL[status]}
    </Badge>
  )
}

const REVIEW_TONE: Record<ReviewState, BadgeTone> = {
  not_checked: "neutral",
  checked: "positive",
  needs_discussion: "warning",
}

const REVIEW_ORDER: ReviewRole[] = ["planner", "designer", "developer"]

// 역할별 확인 — 설정된 역할만 "역할 상태" 칩으로. 아무 역할도 없으면 null(호출부가 "—" 처리).
// 레이아웃(gap/wrap)은 호출 뷰의 전용 module.css가 className으로 준다 — editor.module.css 오염 금지.
export function ReviewBadges({ reviews, className }: { reviews: FeatureReviews | undefined; className?: string }) {
  const entries = REVIEW_ORDER.filter((role): role is ReviewRole => !!reviews?.[role])
  if (entries.length === 0) return null
  return (
    <span className={className}>
      {entries.map((role) => {
        const state = reviews![role] as ReviewState
        return (
          <Badge key={role} variant="pill" tone={REVIEW_TONE[state]}>
            {REVIEW_ROLE_LABEL[role]} {REVIEW_STATE_LABEL[state]}
          </Badge>
        )
      })}
    </span>
  )
}

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

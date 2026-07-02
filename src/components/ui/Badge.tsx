import { type HTMLAttributes } from "react"
import { clsx } from "clsx"
import styles from "./Badge.module.css"

type BadgeVariant = "status" | "method" | "tag" | "pill"
export type BadgeTone = "brand" | "positive" | "warning" | "negative" | "neutral"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  tone?: BadgeTone
}

// 읽기 전용 상태 표식. variant가 형태, tone이 의미색.
// status = dot 있는 상태 pill / method = HTTP 메서드(모노) / tag = PK·FK급 초소형 / pill = 범용 소형(AI 추정 등).
export function Badge({ variant = "pill", tone = "neutral", children, className, ...props }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[variant], styles[tone], className)} {...props}>
      {variant === "status" && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  )
}

// HTTP 메서드 색 관례 — GET=positive, POST=brand, PUT/PATCH=warning, DELETE=negative.
const METHOD_TONE: Record<string, BadgeTone> = {
  GET: "positive",
  POST: "brand",
  PUT: "warning",
  PATCH: "warning",
  DELETE: "negative",
}

export function methodTone(method: string): BadgeTone {
  return METHOD_TONE[method.toUpperCase()] ?? "neutral"
}

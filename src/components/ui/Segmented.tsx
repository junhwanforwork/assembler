"use client"

import { clsx } from "clsx"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./Segmented.module.css"

interface SegmentedProps {
  // tone은 소비처의 기존 시각을 보존한다 — 시각 통일 판단은 디자인 진단(ASM-036) 몫.
  tone: "elevated" | "card" | "outline"
  size?: "sm" | "md"
  "aria-label": string
  className?: string
  children: ReactNode
}

// 세그먼트 컨트롤 컨테이너. 아이템은 SegmentedButton(상호작용)·SegmentedLabel(정적) 조합.
export function Segmented({ tone, size = "sm", className, children, "aria-label": ariaLabel }: SegmentedProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={clsx(styles.group, styles[size], styles[tone], className)}>
      {children}
    </div>
  )
}

interface SegmentedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function SegmentedButton({ active, className, ...rest }: SegmentedButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={!!active}
      className={clsx(styles.btn, active && styles.active, className)}
      {...rest}
    />
  )
}

// 세그가 하나뿐인 동안 쓰는 정적 활성 라벨 — 무반응 버튼을 두지 않는다(인스펙터 "정보" 세그 패턴).
export function SegmentedLabel({ active, className, children }: { active?: boolean; className?: string; children: ReactNode }) {
  return <span className={clsx(styles.btn, active && styles.active, className)}>{children}</span>
}

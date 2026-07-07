import { type ReactNode } from "react"
import { clsx } from "clsx"
import { Badge } from "@/components/ui/Badge"
import s from "./FloatBar.module.css"

// 플로팅 칩 바 프리미티브(P-D) — 캔버스 하단에 도킹되는 pill 표면.
// bottom-center=콘텐츠 폭 벌크바 형태 / bottom-full=좌우로 긴 행(git 상태 바 형태).
// 슬롯: info(좌측 칩·라벨)·actions(우측 버튼) 또는 children(구분 없는 한 줄 조립).
// note는 바 위에 쌓이는 보조 콘텐츠(에러 노트) — 같은 도킹 컬럼 안에서 함께 뜬다.

type FloatBarDock = "bottom-center" | "bottom-full"

const DOCK_CLASS: Record<FloatBarDock, string> = {
  "bottom-center": s.bottomCenter,
  "bottom-full": s.bottomFull,
}

export function FloatBar({
  dock = "bottom-center",
  info,
  actions,
  note,
  children,
  className,
}: {
  dock?: FloatBarDock
  info?: ReactNode
  actions?: ReactNode
  note?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx(s.wrap, DOCK_CLASS[dock], className)}>
      {note}
      <div className={s.bar}>
        {info != null && <div className={s.info}>{info}</div>}
        {children}
        {actions != null && <div className={s.actions}>{actions}</div>}
      </div>
    </div>
  )
}

// 라벨 텍스트 칩 — 레포·브랜치 이름처럼 꾸밈 없는 정보 텍스트.
export function FloatBarLabel({ children }: { children: ReactNode }) {
  return <span className={s.label}>{children}</span>
}

// 수치 칩 — +N=positive / −N=negative / 0=neutral (Badge tone 재사용, git 변경량 문법).
export function FloatBarCount({ value }: { value: number }) {
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral"
  return <Badge tone={tone}>{value > 0 ? `+${value}` : `${value}`}</Badge>
}

// 같은 도킹 자리의 단독 확인 pill — 바가 내려간 뒤 성공 노티스처럼 잠깐 뜨는 문구.
export function FloatBarNotice({
  dock = "bottom-center",
  children,
}: {
  dock?: FloatBarDock
  children: ReactNode
}) {
  return (
    <div className={clsx(s.wrap, DOCK_CLASS[dock])}>
      <span className={s.notice} role="status">
        {children}
      </span>
    </div>
  )
}

import type { SVGProps } from "react"
import { ICON_STROKE } from "@/lib/design-tokens"

// 아이콘 세트 — design.md 카탈로그 정본.
// 색·크기는 currentColor + size 상속 → 버튼 텍스트 색을 따라가 hover 시 자동 브랜드 전환.
// 라인 아이콘: fill=none + stroke=currentColor. 솔리드: fill=currentColor.
// stroke-width는 ICON_STROKE 단일값 — 아이콘별 임의 굵기 금지(드리프트 방지).

// strokeWidth를 타입에서 제외 — 호출부의 임의 굵기 지정을 컴파일 단계에서 차단.
type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height" | "strokeWidth"> & { size?: number }

function Line({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

function Solid({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
      {children}
    </svg>
  )
}

export function SparkIcon({ size = 22, ...props }: IconProps) {
  return (
    <Solid size={size} {...props}>
      <path d="M12 2c.3 3.4 1.5 5.9 3.6 8C13.4 12 12.2 14.6 12 18c-.2-3.4-1.4-5.9-3.6-8C10.5 7.9 11.7 5.4 12 2Z" />
      <path d="M12 2c.3 3.4 1.5 5.9 3.6 8C13.4 12 12.2 14.6 12 18c-.2-3.4-1.4-5.9-3.6-8C10.5 7.9 11.7 5.4 12 2Z" transform="rotate(90 12 12)" />
    </Solid>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Line {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Line>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M12 5v14M5 12h14" />
    </Line>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Line>
  )
}

// editor/icons.tsx CloseIcon과 동일 path — ui 프리미티브(OverlayPanel)가 editor 계층을 역참조하지 않게 카탈로그에 승격.
export function CloseIcon({ size = 14, ...props }: IconProps) {
  return (
    <Line size={size} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Line>
  )
}

export function FileTextIcon({ size = 20, ...props }: IconProps) {
  return (
    <Line size={size} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </Line>
  )
}

export function ChevronDownIcon({ size = 13, ...props }: IconProps) {
  return (
    <Line size={size} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Line>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Line {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Line>
  )
}

export function MoreVerticalIcon(props: IconProps) {
  return (
    <Solid {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </Solid>
  )
}

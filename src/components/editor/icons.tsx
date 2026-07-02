import type { SVGProps } from "react"
import { ICON_STROKE } from "@/lib/design-tokens"

// 에디터 전용 인라인 아이콘 — 프로토타입 02-editor.html SVG 그대로(시각 일치 우선).
// stroke=currentColor → 부모 색 상속. stroke-width는 ICON_STROKE 단일값(드리프트 방지).

// strokeWidth를 타입에서 제외 — 호출부의 임의 굵기 지정을 컴파일 단계에서 차단.
type P = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & { size?: number }

function L({ size = 16, children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} {...p}>
      {children}
    </svg>
  )
}

export function ChevronDown({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M6 9l6 6 6-6" />
    </L>
  )
}

export function ClockIcon({ size = 17, ...p }: P) {
  return (
    <L size={size} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </L>
  )
}

export function PanelLeftIcon({ size = 17, ...p }: P) {
  return (
    <L size={size} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </L>
  )
}

export function PanelRightIcon({ size = 17, ...p }: P) {
  return (
    <L size={size} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </L>
  )
}

export function ChevronRightIcon({ size = 15, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M13 6l6 6-6 6" />
    </L>
  )
}

export function TreeFolderIcon({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M3 7h7l2 2h9v10a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
    </L>
  )
}

export function ChatIcon({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" />
    </L>
  )
}

export function DatabaseIcon({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </L>
  )
}

export function DatabaseMiniIcon({ size = 13, ...p }: P) {
  return (
    <L size={size} {...p}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    </L>
  )
}

export function ApiListIcon({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </L>
  )
}

export function GitIcon({ size = 13, ...p }: P) {
  return (
    <L size={size} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V3M12 21v-6" />
    </L>
  )
}

export function LockIcon({ size = 13, ...p }: P) {
  return (
    <L size={size} {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </L>
  )
}

export function CodeIcon({ size = 15, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </L>
  )
}

export function SearchIcon({ size = 16, ...p }: P) {
  return (
    <L size={size} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </L>
  )
}

export function TreeViewIcon({ size = 16, ...p }: P) {
  return (
    <L size={size} {...p}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 12h5M12 12l5-5M12 12l5 5" />
    </L>
  )
}

export function DirViewIcon({ size = 16, ...p }: P) {
  return (
    <L size={size} {...p}>
      <rect x="3" y="4" width="6" height="16" rx="1" />
      <rect x="10" y="4" width="11" height="16" rx="1" />
    </L>
  )
}

export function DocViewIcon({ size = 16, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M5 3h10l4 4v14H5z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </L>
  )
}

export function CloseIcon({ size = 14, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </L>
  )
}

export function SendIcon({ size = 15, ...p }: P) {
  return (
    <L size={size} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </L>
  )
}

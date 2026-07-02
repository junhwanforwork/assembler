import { clsx } from "clsx"
import s from "./AssemblyLoader.module.css"

// 노드가 떠오르고 커넥터가 그어지는 조립 루프 — 생성·로딩 상태 전용.
// 로딩 의미는 애니메이션이 아니라 label 텍스트가 전달한다(reduced-motion에서도 유지).
// label이 없으면 라이브 리전이 비므로 순수 장식(aria-hidden)으로 렌더한다.
export function AssemblyLoader({
  size = 96,
  label,
  className,
}: {
  size?: number
  label?: string
  className?: string
}) {
  return (
    <span className={clsx(s.root, className)} {...(label ? { role: "status" } : { "aria-hidden": true })}>
      <svg width={size} height={(size * 72) / 120} viewBox="0 0 120 72" aria-hidden="true">
        <g className={s.cycle}>
          <path className={clsx(s.edge, s.edgeAB)} d="M32 36 C 53 36, 57 16, 78 16" pathLength="1" />
          <path className={clsx(s.edge, s.edgeAC)} d="M32 36 C 53 36, 57 56, 78 56" pathLength="1" />
          <rect className={clsx(s.node, s.nodeA)} x="18" y="29" width="14" height="14" rx="4" />
          <rect className={clsx(s.node, s.nodeB)} x="78" y="9" width="14" height="14" rx="4" />
          <rect className={clsx(s.node, s.nodeC)} x="78" y="49" width="14" height="14" rx="4" />
        </g>
      </svg>
      {label && <span className={s.label}>{label}</span>}
    </span>
  )
}

import s from "./EmptyStateArt.module.css"

// 빈 상태·온보딩 장식 일러스트 — 블록이 스태거로 놓이고 커넥터가 그어진 뒤 은은하게 부유.
// 순수 장식(aria-hidden). 빈 상태의 의미는 곁의 카피가 전달한다.
export function EmptyStateArt({ size = 200, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * 140) / 200} viewBox="0 0 200 140" aria-hidden="true" className={className}>
      <rect className={s.frame} x="14" y="14" width="172" height="112" rx="12" />
      <g className={s.float}>
        <path className={s.edge} d="M76 56 C 96 56, 100 84, 120 84" pathLength="1" />
        <rect className={s.block} x="36" y="40" width="40" height="32" rx="6" />
        <rect className={`${s.block} ${s.block2}`} x="120" y="68" width="40" height="32" rx="6" />
        <rect className={`${s.block} ${s.block3}`} x="120" y="30" width="40" height="24" rx="6" />
      </g>
    </svg>
  )
}

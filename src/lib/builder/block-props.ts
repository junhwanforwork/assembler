import type { Block } from "@/lib/types/builder"
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog"

// 블록 props 안전 읽기 — BlockRenderer·SkeletonBlockRenderer 공유 단일 출처.
// 카탈로그 기본값 폴백을 거쳐 누락/잘못된 props에도 안정적으로 값을 돌려준다.

// 타입별 props에서 키 하나를 폴백과 함께 안전하게 읽는다.
export function readProp<T>(block: Block, key: string, fallback: T): T {
  const raw = block.props[key]
  if (raw !== undefined && raw !== null) return raw as T
  // ?. — 직렬화 깨짐 등으로 type이 유니온 밖이면 map 항목이 undefined. 유니온 멤버 경로에선 no-op.
  const def = BLOCK_DEF_MAP[block.type]?.defaultProps[key]
  return (def as T) ?? fallback
}

export function readString(block: Block, key: string, fallback: string): string {
  const v = readProp<unknown>(block, key, fallback)
  return typeof v === "string" ? v : fallback
}

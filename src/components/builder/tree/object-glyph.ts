import { COLOR } from "@/lib/design-tokens"
import type { GraphNodeType } from "@/lib/store/graph"

// 객체 타입별 글리프(머리글자) + 색 — 코드 에디터 파일아이콘처럼 종류를 한눈에 구분.
// 색은 토큰만 사용(ds-tokens.md). 의미는 letter+label로도 전달하므로 색에만 의존하지 않는다.

export const NODE_GLYPH: Record<GraphNodeType, { letter: string; label: string }> = {
  requirement: { letter: "R", label: "Requirement" },
  feature: { letter: "F", label: "Feature" },
  page: { letter: "P", label: "Page" },
  uiElement: { letter: "E", label: "UI Element" },
  api: { letter: "A", label: "API" },
  database: { letter: "D", label: "Database" },
}

export const NODE_TINT: Record<GraphNodeType, string> = {
  requirement: COLOR.ACCENT,
  feature: COLOR.POSITIVE,
  page: COLOR.TEXT_LABEL,
  uiElement: COLOR.TEXT_MUTED,
  api: COLOR.WARNING,
  database: COLOR.ACCENT_HOVER,
}

import type { ChangeStatus, ImplStatus, ReviewRole, ReviewState } from "@/lib/types/assembler"

// 기능 명세서 Table/Card 뷰의 순수 표시 규약(읽기 전용) — SW1 상태 필드의 한글 라벨.
// 색(tone) 매핑은 Badges.tsx가 소유(컴포넌트 레이어), 여기는 라벨·수치 포맷만.

export const IMPL_STATUS_LABEL: Record<ImplStatus, string> = {
  not_started: "미구현",
  in_progress: "진행중",
  implemented: "구현됨",
  partial: "부분",
  unknown: "미정",
}

export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  no_change: "변경없음",
  changed: "변경됨",
  needs_review: "검토필요",
  confirmed: "확정",
}

export const REVIEW_ROLE_LABEL: Record<ReviewRole, string> = {
  planner: "기획",
  designer: "디자인",
  developer: "개발",
}

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  not_checked: "미확인",
  checked: "확인",
  needs_discussion: "논의필요",
}

// 연결 수 셀 — 값이 있으면 개수, 미설정(undefined)·빈 배열은 "—"(읽기 전용 표 규약).
export function countOrDash(ids: string[] | undefined): string {
  return ids && ids.length > 0 ? String(ids.length) : "—"
}

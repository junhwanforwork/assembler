import { describe, expect, it } from "vitest"
import {
  CHANGE_STATUS_LABEL,
  countOrDash,
  IMPL_STATUS_LABEL,
  REVIEW_ROLE_LABEL,
  REVIEW_STATE_LABEL,
} from "./specViewFormat"

// 표/카드 뷰의 순수 표시 규약(읽기 전용) — 한글 라벨 매핑 + 빈 값 "—" 통일.
describe("specViewFormat", () => {
  it("implStatus 라벨 5종은 전부 한글", () => {
    expect(IMPL_STATUS_LABEL.not_started).toBe("미구현")
    expect(IMPL_STATUS_LABEL.in_progress).toBe("진행중")
    expect(IMPL_STATUS_LABEL.implemented).toBe("구현됨")
    expect(IMPL_STATUS_LABEL.partial).toBe("부분")
    expect(IMPL_STATUS_LABEL.unknown).toBe("미정")
  })

  it("changeStatus 라벨 4종", () => {
    expect(CHANGE_STATUS_LABEL.no_change).toBe("변경없음")
    expect(CHANGE_STATUS_LABEL.changed).toBe("변경됨")
    expect(CHANGE_STATUS_LABEL.needs_review).toBe("검토필요")
    expect(CHANGE_STATUS_LABEL.confirmed).toBe("확정")
  })

  it("review 역할·상태 라벨", () => {
    expect(REVIEW_ROLE_LABEL.planner).toBe("기획")
    expect(REVIEW_ROLE_LABEL.designer).toBe("디자인")
    expect(REVIEW_ROLE_LABEL.developer).toBe("개발")
    expect(REVIEW_STATE_LABEL.not_checked).toBe("미확인")
    expect(REVIEW_STATE_LABEL.checked).toBe("확인")
    expect(REVIEW_STATE_LABEL.needs_discussion).toBe("논의필요")
  })

  it("countOrDash: 값이 있으면 개수, 없거나 빈 배열이면 —", () => {
    expect(countOrDash(["a", "b"])).toBe("2")
    expect(countOrDash(["a"])).toBe("1")
    expect(countOrDash([])).toBe("—")
    expect(countOrDash(undefined)).toBe("—")
  })
})

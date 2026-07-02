import { describe, expect, it } from "vitest"
import type { DesignDelta, DeltaCounts } from "@/lib/assembler/diff"
import { activityLine, relativeTime, summarizeDelta } from "./activityCopy"

const EMPTY_COLLECTION = { added: [], removed: [], modified: [] }

function fullDelta(overrides: Partial<DesignDelta["collections"]>, links: DesignDelta["links"] = []): DesignDelta {
  return {
    collections: {
      requirements: EMPTY_COLLECTION,
      features: EMPTY_COLLECTION,
      pages: EMPTY_COLLECTION,
      flows: EMPTY_COLLECTION,
      wireframes: EMPTY_COLLECTION,
      elements: EMPTY_COLLECTION,
      ...overrides,
    },
    links,
  }
}

describe("summarizeDelta", () => {
  it("객체 델타 → '기능 1개 수정 · 페이지 1개 추가' 형태 한 줄", () => {
    const delta = fullDelta({
      features: { added: [], removed: [], modified: ["feat-1"] },
      pages: { added: ["page-9"], removed: [], modified: [] },
    })
    expect(summarizeDelta(delta)).toBe("기능 1개 수정 · 페이지 1개 추가")
  })

  it("같은 컬렉션은 추가→삭제→수정 순으로, 연결 변경은 끝에 붙는다", () => {
    const delta = fullDelta(
      { requirements: { added: ["r1", "r2"], removed: ["r3"], modified: ["r4"] } },
      [{ from: "feature:f1", field: "apiIds", added: ["api-1"], removed: [] }]
    )
    expect(summarizeDelta(delta)).toBe("요구사항 2개 추가 · 요구사항 1개 삭제 · 요구사항 1개 수정 · 연결 1곳 변경")
  })

  it("truncated(개수 요약)도 같은 형식으로 표기한다", () => {
    const counts: DeltaCounts = {
      truncated: true,
      collections: {
        requirements: { added: 0, removed: 0, modified: 0 },
        features: { added: 12, removed: 0, modified: 3 },
        pages: { added: 0, removed: 5, modified: 0 },
        flows: { added: 0, removed: 0, modified: 0 },
        wireframes: { added: 0, removed: 0, modified: 0 },
        elements: { added: 0, removed: 0, modified: 0 },
      },
      links: 40,
    }
    expect(summarizeDelta(counts)).toBe("기능 12개 추가 · 기능 3개 수정 · 페이지 5개 삭제 · 연결 40곳 변경")
  })

  it("변경 없음·형태 불명 델타는 빈 문자열", () => {
    expect(summarizeDelta(fullDelta({}))).toBe("")
    expect(summarizeDelta(undefined)).toBe("")
    expect(summarizeDelta({ what: "ever" })).toBe("")
  })
})

describe("activityLine", () => {
  it("워크스페이스 이벤트 — 이름을 메타로 분리한다", () => {
    expect(activityLine("workspace_created", { name: "결제 스펙" })).toEqual({
      title: "새 스펙을 만들었어요",
      name: "결제 스펙",
    })
    expect(activityLine("workspace_renamed", { name: "정산 스펙" }).title).toBe("스펙 이름을 바꿨어요")
    expect(activityLine("workspace_deleted", { name: "임시" }).title).toBe("스펙을 삭제했어요")
  })

  it("design_updated — 델타 한 줄이 제목이 되고, 델타가 비면 저장 문구로", () => {
    const delta = fullDelta({ features: { added: [], removed: [], modified: ["f1"] } })
    expect(activityLine("design_updated", { name: "결제 스펙", delta })).toEqual({
      title: "기능 1개 수정",
      name: "결제 스펙",
    })
    expect(activityLine("design_updated", { name: "결제 스펙" }).title).toBe("설계를 저장했어요")
  })

  it("동기화 이벤트 — count를 표기하고, 없으면 개수 없이", () => {
    expect(activityLine("apis_synced", { count: 7 }).title).toBe("API 7개를 코드에서 가져왔어요")
    expect(activityLine("db_tables_synced", { count: 3 }).title).toBe("DB 테이블 3개를 코드에서 가져왔어요")
    expect(activityLine("apis_synced", {}).title).toBe("API를 코드에서 가져왔어요")
  })

  it("file_generated — AI 초안 생성", () => {
    expect(activityLine("file_generated", { name: "새 스펙" })).toEqual({
      title: "AI가 설계 초안을 만들었어요",
      name: "새 스펙",
    })
  })

  it("metadata 형태가 어긋나도 안전하다(name 비문자열 → null)", () => {
    expect(activityLine("workspace_created", { name: 42 }).name).toBeNull()
  })
})

describe("relativeTime", () => {
  const now = new Date("2026-07-02T12:00:00+09:00")

  it("분·시간·일 단위 상대 표기", () => {
    expect(relativeTime("2026-07-02T11:59:30+09:00", now)).toBe("방금 전")
    expect(relativeTime("2026-07-02T11:45:00+09:00", now)).toBe("15분 전")
    expect(relativeTime("2026-07-02T05:00:00+09:00", now)).toBe("7시간 전")
    expect(relativeTime("2026-06-29T12:00:00+09:00", now)).toBe("3일 전")
  })

  it("7일 이상은 날짜 표기, 해가 다르면 연도 포함", () => {
    expect(relativeTime("2026-06-12T09:00:00+09:00", now)).toBe("6월 12일")
    expect(relativeTime("2025-12-31T09:00:00+09:00", now)).toBe("2025년 12월 31일")
  })

  it("미래·파싱 불가 값은 방금 전으로 뭉갠다", () => {
    expect(relativeTime("2026-07-02T12:00:05+09:00", now)).toBe("방금 전")
    expect(relativeTime("not-a-date", now)).toBe("방금 전")
  })
})

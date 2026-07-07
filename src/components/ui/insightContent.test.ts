import { describe, it, expect } from "vitest"
import { insightSections } from "./insightContent"

// InsightCard(ASM-057)의 섹션 정규화 — 하위호환(구형 단문 노트)과 "빈 섹션 방출 금지"(정직 원칙)를 고정.
// 컴포넌트 테스트 인프라(jsdom)가 없어 렌더 판정 로직을 순수 모듈로 분리해 검증한다(floating.ts 선례).

describe("insightSections", () => {
  it("pros/cons 둘 다 있으면 좋은 점(positive)·주의할 점(negative) 순서로 만든다", () => {
    expect(insightSections(["기록이 한 곳에 모여요."], ["담당자 정보는 없어요."])).toEqual([
      { key: "pros", heading: "좋은 점", tone: "positive", items: ["기록이 한 곳에 모여요."] },
      { key: "cons", heading: "주의할 점", tone: "negative", items: ["담당자 정보는 없어요."] },
    ])
  })

  it("pros/cons가 없으면(구형 단문 노트) 섹션을 만들지 않는다", () => {
    expect(insightSections(undefined, undefined)).toEqual([])
  })

  it("빈 배열·공백 항목만이면 그 섹션을 방출하지 않는다", () => {
    expect(insightSections([], ["  ", ""])).toEqual([])
  })

  it("한쪽만 있으면 그 섹션만 만든다", () => {
    const sections = insightSections(undefined, ["연결이 아직 적어요."])
    expect(sections).toHaveLength(1)
    expect(sections[0].key).toBe("cons")
  })

  it("항목을 트림하고 빈 항목을 걸러낸다", () => {
    expect(insightSections([" 기록이 모여요. ", ""], undefined)).toEqual([
      { key: "pros", heading: "좋은 점", tone: "positive", items: ["기록이 모여요."] },
    ])
  })
})

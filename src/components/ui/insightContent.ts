// InsightCard(ASM-057)의 섹션 정규화 — 렌더 판정을 순수 로직으로 분리(컴포넌트 테스트 인프라 부재, floating.ts 선례).
// 정직 원칙: 내용 없는 섹션은 만들지 않는다 — 구형 단문 노트는 요약만 렌더된다.

export type InsightTone = "positive" | "negative"

export type InsightSection = {
  key: "pros" | "cons"
  heading: string
  tone: InsightTone
  items: string[]
}

function cleanItems(items: string[] | undefined): string[] {
  if (!items) return []
  return items.map((item) => item.trim()).filter((item) => item.length > 0)
}

export function insightSections(pros: string[] | undefined, cons: string[] | undefined): InsightSection[] {
  const sections: InsightSection[] = []
  const cleanPros = cleanItems(pros)
  const cleanCons = cleanItems(cons)
  if (cleanPros.length > 0) sections.push({ key: "pros", heading: "좋은 점", tone: "positive", items: cleanPros })
  if (cleanCons.length > 0) sections.push({ key: "cons", heading: "주의할 점", tone: "negative", items: cleanCons })
  return sections
}

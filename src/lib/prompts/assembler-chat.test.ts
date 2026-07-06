import { describe, it, expect } from "vitest"
import { CHAT_SYSTEM, CHAT_SCHEMA, buildChatUserMessage } from "./assembler-chat"
import { createEmptyDesign } from "@/lib/types/design"

// ASM-052 크로스체크 정정 — 챗 계약 문면 고정(assembler-generate.test.ts 관례). 유료 호출 0.
// HIGH: features 모양에 dbTableIds 누락 → applyChangePlan(행 전체 교체) + normalizer 백필로
//       챗 기능 수정 시 dbTableIds가 빈 배열로 소실되는 시나리오를 계약 문면 검사로 고정.
// MED: 와이어/요소 생성 안내는 문면만 후퇴 — op enum·apply 경로는 휴면 유지(레거시 수정 보존).

describe("CHAT_SYSTEM — features 모양 dbTableIds (HIGH)", () => {
  it("plan_rules의 features 항목 모양에 dbTableIds가 있다 — 없으면 전체 교체+백필로 연결 소실", () => {
    const featuresShape = CHAT_SYSTEM.match(/features=\{[^}]*\[\{[^}]*\}\][^}]*\}/)?.[0] ?? ""
    expect(featuresShape).toContain("apiIds")
    expect(featuresShape).toContain("dbTableIds")
  })
})

describe("CHAT_SYSTEM — 와이어/요소 생성 안내 후퇴 (MED, 문면만)", () => {
  it("사슬 안내에 Wireframe·UIElement 마디가 없다", () => {
    expect(CHAT_SYSTEM).not.toContain("Wireframe")
    expect(CHAT_SYSTEM).not.toContain("UIElement")
  })

  it("plan_rules 컬렉션 나열·항목 모양에서 wireframes/elements를 안내하지 않는다", () => {
    expect(CHAT_SYSTEM).not.toContain("wireframes=")
    expect(CHAT_SYSTEM).not.toContain("elements=")
    expect(CHAT_SYSTEM).not.toContain("|wireframes|elements")
    expect(CHAT_SYSTEM).not.toContain("wireframe.elementIds")
  })

  it("코드-진실 환각 금지·계획 전용 카디널 룰은 유지된다", () => {
    expect(CHAT_SYSTEM).toContain("코드-진실 id만")
    expect(CHAT_SYSTEM).toContain("plan으로만")
  })
})

describe("CHAT_SCHEMA — 응답 계약 불변 (휴면 유지)", () => {
  it("op collection enum은 6종 그대로 — 레거시 와이어 데이터 수정 경로 보존", () => {
    const plan = (CHAT_SCHEMA.properties as Record<string, { anyOf: { properties?: Record<string, unknown> }[] }>).plan
    const ops = plan.anyOf[0].properties?.ops as { items: { properties: { collection: { enum: string[] } } } }
    expect(ops.items.properties.collection.enum).toEqual([
      "requirements",
      "features",
      "pages",
      "flows",
      "wireframes",
      "elements",
    ])
  })
})

describe("buildChatUserMessage", () => {
  it("빈 코드-진실이면 빈 배열 지시를 싣는다", () => {
    const msg = buildChatUserMessage(createEmptyDesign(), [], [], "기능 추가해줘")
    expect(msg).toContain("apiIds는 모두 빈 배열로")
    expect(msg).toContain("dbTableIds는 모두 빈 배열로")
    expect(msg).toContain("기능 추가해줘")
  })
})

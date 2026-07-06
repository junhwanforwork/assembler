import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { TODO_APP } from "./golden/todo-app"
import { USED_MARKET } from "./golden/used-market"
import { FOOD_DELIVERY } from "./golden/food-delivery"
import { GYM_BOOKING } from "./golden/gym-booking"

// Assembler 생성 파이프라인 few-shot 한국어 골든셋 — ass-061 자산을 개정 계약(ASM-052)으로 재작성.
// 각 예시는 이상적인 WorkspaceDesign: 와이어 없음(wireframes/elements 빈 배열), dangling 0, 고립 0,
// 코드-진실 참조(apiIds·dbTableIds)는 함께 든 apis/dbTables의 id만 쓴다 — Feature가 연결의 1급 주인.
// 용도: (1) GENERATE_SYSTEM few-shot 주입 후보, (2) prompt-evaluator 게이트 정답 기준.
// 게이트 정본 = golden-set.test.ts(npm test 상시) + scripts/verify-goldenset.ts(CLI 동일 검사).
// ⚠️ 라이브 few-shot 주입은 미배선 — 품질·토큰 회귀 측정 후 결정(미측정 주입은 회귀 위험).

export type GoldenExample = {
  id: string
  idea: string
  // 코드-진실 입력 — buildGenerateUserMessage의 available_apis/available_db_tables에 해당.
  apis: Api[]
  dbTables: DbTable[]
  // 이상적 출력 — 개정 계약이라 wireframes/elements는 항상 빈 배열(직렬화에서 제외).
  design: WorkspaceDesign
}

// 도메인 분포 균형 — 태스크/거래/주문/예약 4개 distinct 도메인. 화면 수(2~4)·흐름 모양(왕복·분기·퍼널·역방향) 다양화.
export const GOLDEN_SET: GoldenExample[] = [TODO_APP, USED_MARKET, FOOD_DELIVERY, GYM_BOOKING]

// 개정 계약 정렬 — 모델 출력엔 wireframes/elements 키 자체가 없다. 골든 출력도 4개 컬렉션만 직렬화.
export function serializeGoldenOutput(design: WorkspaceDesign): string {
  const { requirements, features, pages, flows } = design
  return JSON.stringify({ requirements, features, pages, flows })
}

// few-shot 텍스트 렌더 — buildGenerateUserMessage의 <product_idea> 포맷과 정렬해
// 모델이 입력(아이디어+코드-진실)→출력(JSON) 매핑을 그대로 학습하게 한다.
export function buildFewShotExamples(): string {
  return GOLDEN_SET.map((ex) => {
    const apiLines = ex.apis.map((a) => `- id=${a.id} ${a.method} ${a.endpoint} — ${a.summary} [${a.status}]`).join("\n")
    const dbLines = ex.dbTables.map((t) => `- id=${t.id} ${t.name} — ${t.description} (${t.columns.map((c) => c.name).join(", ")})`).join("\n")
    return `<product_idea>\n${ex.idea.trim()}\n</product_idea>\n<available_apis>\n${apiLines}\n</available_apis>\n<available_db_tables>\n${dbLines}\n</available_db_tables>\n${serializeGoldenOutput(ex.design)}`
  }).join("\n\n---\n\n")
}

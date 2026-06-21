// Assembler 생성 파이프라인 few-shot 한국어 골든셋 (ASS-061).
// 각 예시는 이상적인 ProjectGraph — dangling 0, 고립 0, 모든 UIElement 매핑 완성, navigate↔edge 정합.
// 용도: (1) ASSEMBLER 프롬프트 few-shot 주입 후보, (2) ASS-062 eval 하네스 정답 기준.
// ASSEMBLER_SYSTEM/route 미와이어링 — 라이브 few-shot 주입은 ASS-062 eval로 품질·토큰 회귀를 측정한 뒤 결정한다(미측정 주입은 회귀 위험).

import type { ProjectGraph } from "@/lib/types/assembler"
import { TODO_APP } from "@/lib/prompts/golden/todo-app"
import { USED_MARKET } from "@/lib/prompts/golden/used-market"
import { FOOD_DELIVERY } from "@/lib/prompts/golden/food-delivery"
import { GYM_BOOKING } from "@/lib/prompts/golden/gym-booking"

export type GoldenExample = {
  idea: string
  graph: ProjectGraph
}

// 도메인 분포 균형 — 4개 distinct 도메인(태스크/거래/주문/예약). 편향 방지를 위해 화면 수·result.kind를 다양화.
export const GOLDEN_SET: GoldenExample[] = [TODO_APP, USED_MARKET, FOOD_DELIVERY, GYM_BOOKING]

// few-shot 텍스트 렌더 — 각 예시를 "Product idea: …\n<JSON>" 형태로 직렬화해 ASSEMBLER 프롬프트에 주입 가능한 블록으로 만든다.
// buildAssemblerUserMessage 의 "Product idea:\n…" 포맷과 정렬 — 모델이 입력→출력 매핑을 그대로 학습한다.
export function buildFewShotExamples(): string {
  return GOLDEN_SET.map(
    (ex) => `Product idea:\n${ex.idea.trim()}\n${JSON.stringify(ex.graph)}`,
  ).join("\n\n---\n\n")
}

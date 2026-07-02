import type { WorkspaceDesign } from "./assembler"

// 에디터 AI 챗(ASM-006) 데이터 계약 — 단일 출처.
// 카디널 룰(editor-interactions.md #16): 변경성 요청은 그래프 직행 금지 —
// AI는 변경 계획(plan)까지만 만들고, 적용은 사용자가 도크에서 승인한 뒤
// applyChangePlan → 스코프드 PATCH(ASM-010)로 저장된다.

// 요청 히스토리 한 턴. 영속 없음 — 클라이언트가 세션 동안 들고 온다(ai-prompt-conversation.md §D-7).
export type ChatTurn = {
  role: "user" | "assistant"
  text: string
}

// 번호는 UI에서 index+1 파생(ai-prompt-conversation.md §A) — 데이터엔 id만.
export type ClarifyOption = {
  id: string
  label: string
}

export type DesignCollectionKey = keyof WorkspaceDesign

export type ChangeOpAction = "add" | "update" | "remove"

// 변경 계획 도크의 행 하나 — 디자인 그래프 컬렉션 항목 단위 조작.
// add/update의 payload는 항목 "전체"(부분 병합 아님 — 적용 의미를 단순하게 유지).
// remove는 payload null. 살균(parseChatOutput) 후엔 targetId가 컬렉션 현존 여부와 정합함이 보장된다.
export type ChangeOp = {
  id: string
  collection: DesignCollectionKey
  action: ChangeOpAction
  targetId: string
  // 도크 행에 보이는 해요체 한 줄("법인 카드 요구사항을 추가해요").
  summary: string
  payload: Record<string, unknown> | null
}

export type ChangePlan = {
  title: string
  summary: string
  ops: ChangeOp[]
}

// 어시스턴트 응답 = 블록 배열(ai-prompt-conversation.md §A 형식의 에디터 버전).
// progress/summary 블록은 생성 패널 전용이라 제외 — 에디터 챗은 text·clarify·plan 3종.
export type AssistantBlock =
  | { kind: "text"; text: string }
  | { kind: "clarify"; question: string; options: ClarifyOption[] }
  | { kind: "plan"; plan: ChangePlan }

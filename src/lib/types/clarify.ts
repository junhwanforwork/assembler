// AI 브리프 질문지 타입 (ASS-209, 생성 전 Clarify 단계) — 단일 출처.
// 아이디어 → /api/clarify 가 이 형태의 questionnaire 를 만들고, 사용자의 답(ClarifyAnswers)을
// brief 텍스트로 직렬화해 그래프 생성 user message 를 증강한다. 생성 계약(assembler.ts)은 불변.

export type ClarifyKind = "single" | "multi" | "slider" | "text"

/** single|multi 선택지. value=직렬화 키(고유), label=표시 텍스트. */
export type ClarifyOption = {
  value: string
  label: string
  description?: string
}

export type ClarifyQuestion = {
  id: string
  kind: ClarifyKind
  title: string
  hint?: string
  /** single|multi 선택지 (정규화 후 2–6개). */
  options?: ClarifyOption[]
  /** slider 범위 (kind==="slider"). */
  range?: { min: number; max: number; step?: number; default: number }
  /** "알아서 정해줘"(AI 위임) 칩 노출. 기본 true. */
  allowDecideForMe?: boolean
  /** 자유입력(Other) 칩 노출. */
  allowOther?: boolean
}

export type ClarifyQuestionnaire = {
  questions: ClarifyQuestion[]
}

/** 질문 1개에 대한 답. decided=AI 위임(값 없음). */
export type ClarifyAnswer =
  | { decided: true }
  | { kind: "single"; value: string }
  | { kind: "multi"; values: string[] }
  | { kind: "slider"; value: number }
  | { kind: "text"; value: string }

/** 질문 id → 답. 미응답 질문은 키 없음(= 미정, brief 에서 생략). */
export type ClarifyAnswers = Record<string, ClarifyAnswer>

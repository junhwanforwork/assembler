// 답(ClarifyAnswers) → brief 텍스트 직렬화 (ASS-209). 생성 user message 에 덧붙어 그래프 품질을 높인다.
// 답이 하나도 없으면 "" (= brief skip, 기존 바로-생성 경로와 비트 동일).
// decided(AI 위임)는 "(AI decides)" 로 표기 — 모델이 합리적 기본값을 채우도록(generation.md 계약).
// 마커는 영어(모델 지시용), 답 내용은 입력 언어 그대로(label/자유입력).

import type {
  ClarifyAnswer,
  ClarifyAnswers,
  ClarifyQuestion,
  ClarifyQuestionnaire,
} from "@/lib/types/clarify"

export function buildBrief(questionnaire: ClarifyQuestionnaire, answers: ClarifyAnswers): string {
  const lines: string[] = []
  for (const q of questionnaire.questions) {
    const value = answerLine(q, answers[q.id])
    if (value) lines.push(`- ${q.title}: ${value}`)
  }
  if (lines.length === 0) return ""
  return `=== Clarified brief (user answers) ===\n${lines.join("\n")}`
}

function answerLine(q: ClarifyQuestion, answer: ClarifyAnswer | undefined): string | null {
  if (!answer) return null
  if ("decided" in answer) return "(AI decides)"
  switch (answer.kind) {
    case "single":
      return optionLabel(q, answer.value)
    case "multi":
      return answer.values.length
        ? answer.values.map((v) => optionLabel(q, v)).join(", ")
        : null
    case "slider":
      // 범위를 함께 줘 모델이 스케일을 해석하게 한다(맨숫자만으론 단위 불명).
      return q.range ? `${answer.value} (${q.range.min}–${q.range.max})` : String(answer.value)
    case "text":
      return answer.value.trim() || null
  }
}

// value → 사람이 읽는 label. 매칭 없으면 value 그대로(Other 자유입력 대비).
function optionLabel(q: ClarifyQuestion, value: string): string {
  return q.options?.find((o) => o.value === value)?.label ?? value
}

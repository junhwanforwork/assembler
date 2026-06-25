import { getSessionId } from "@/lib/session"
import { normalizeQuestionnaire } from "@/lib/clarify/normalize"
import type { ClarifyQuestionnaire } from "@/lib/types/clarify"

// 아이디어 → 브리프 질문지 클라이언트 API (ASS-210). x-session-id 헤더 주입.
// 브리프는 보조 단계 — 실패(네트워크·서버)해도 throw 하지 않고 빈 질문지를 반환한다.
// 호출부(ProjectListClient)는 questions.length===0 이면 바로-생성으로 폴백 → 사용자를 막지 않는다.
export async function fetchClarify(idea: string): Promise<ClarifyQuestionnaire> {
  try {
    const res = await fetch("/api/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
      body: JSON.stringify({ idea }),
    })
    if (!res.ok) return { questions: [] }
    const json = (await res.json()) as { questionnaire?: unknown }
    return normalizeQuestionnaire(json.questionnaire)
  } catch {
    return { questions: [] }
  }
}

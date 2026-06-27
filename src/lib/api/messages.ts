import { ApiError } from "./client"

// 서버 에러 코드 → 해요체 사용자 카피(ux-writing.md: 상황 + 다음 행동).
const MESSAGES: Record<string, string> = {
  network_error: "네트워크 연결을 확인하고 다시 시도해 주세요.",
  server_error: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
  ai_error: "생성 중 일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
  ai_unavailable: "지금은 생성을 사용할 수 없어요. 잠시 후 다시 시도해 주세요.",
  ai_refused: "이 아이디어로는 만들기 어려워요. 조금 더 구체적으로 적어 주세요.",
  incoherent_graph: "구조를 깔끔하게 잇지 못했어요. 다시 시도해 주세요.",
  invalid_json: "구조를 만들지 못했어요. 다시 시도해 주세요.",
  not_found: "찾을 수 없어요. 새로고침 후 다시 시도해 주세요.",
  missing_session: "세션을 확인하지 못했어요. 새로고침 후 다시 시도해 주세요.",
}

export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : ""
  return MESSAGES[code] ?? "잠시 후 다시 시도해 주세요."
}

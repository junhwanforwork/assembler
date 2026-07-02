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
  rate_limited: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.",
  // 입력 검증(400) — ASM-005: 폴백 대신 무엇을 고치면 되는지 안내.
  invalid_body: "요청 내용을 처리하지 못했어요. 새로고침 후 다시 시도해 주세요.",
  invalid_idea: "아이디어를 4000자 이내로 입력해 주세요.",
  invalid_name: "이름을 확인하고 다시 입력해 주세요.",
  invalid_description: "설명 형식이 맞지 않아요. 다시 확인해 주세요.",
  invalid_product_id: "프로덕트를 찾지 못했어요. 새로고침 후 다시 시도해 주세요.",
  empty_patch: "바꿀 내용이 없어요. 수정할 값을 입력해 주세요.",
  invalid_explanation: "설명을 입력해 주세요. 2000자까지 쓸 수 있어요.",
  invalid_design_shape: "설계 데이터 형식이 맞지 않아요. 새로고침 후 다시 시도해 주세요.",
  invalid_design_item: "설계 항목 형식이 맞지 않아요. 새로고침 후 다시 시도해 주세요.",
  dangling_refs: "연결이 끊어진 항목이 있어 저장할 수 없어요. 참조를 정리하고 다시 시도해 주세요.",
  // 편집 파이프라인(ASM-010).
  duplicate_design_id: "같은 id가 중복된 항목이 있어요. 새로고침 후 다시 시도해 주세요.",
  conflict: "다른 곳에서 먼저 저장됐어요. 새로고침 후 다시 시도해 주세요.",
  // 에디터 AI 챗(ASM-006).
  invalid_messages: "메시지 형식이 맞지 않아요. 새로고침 후 다시 시도해 주세요.",
  message_too_long: "메시지를 4000자 이내로 입력해 주세요.",
  too_many_messages: "대화가 너무 길어요. 새 대화로 다시 시작해 주세요.",
  invalid_chat_output: "답변을 만들지 못했어요. 다시 시도해 주세요.",
  invalid_plan: "변경 계획을 만들지 못했어요. 다시 시도해 주세요.",
  plan_conflict: "계획과 현재 설계가 어긋나요. 새로고침 후 다시 시도해 주세요.",
  design_too_large_for_chat: "설계가 너무 커서 대화로 다룰 수 없어요. 항목을 줄이고 다시 시도해 주세요.",
  // 크기 캡(ASM-004).
  payload_too_large: "데이터가 너무 커서 처리할 수 없어요. 내용을 줄이고 다시 시도해 주세요.",
  design_too_large: "설계 항목이 너무 많아서 저장할 수 없어요. 항목을 줄이고 다시 시도해 주세요.",
  too_many_apis: "API가 너무 많아서 동기화할 수 없어요. 나눠서 보내 주세요.",
  too_many_tables: "테이블이 너무 많아서 동기화할 수 없어요. 나눠서 보내 주세요.",
  too_many_columns: "컬럼이 너무 많은 테이블이 있어요. 컬럼 수를 확인해 주세요.",
  // 싱크-인(코드/MCP) 검증 — 개발 도구 대면이지만 폴백 의존 없이 원인을 짚어 준다.
  invalid_apis: "API 목록 형식이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_method: "지원하지 않는 HTTP 메서드가 있어요. 데이터를 확인해 주세요.",
  invalid_endpoint: "엔드포인트가 비어 있는 항목이 있어요. 데이터를 확인해 주세요.",
  invalid_source: "출처(source) 값이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_summary: "요약(summary) 형식이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_status: "상태(status) 값이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_tables: "테이블 목록 형식이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_table_name: "테이블 이름이 비어 있는 항목이 있어요. 데이터를 확인해 주세요.",
  invalid_columns: "컬럼 목록 형식이 맞지 않아요. 데이터를 확인해 주세요.",
  invalid_column: "컬럼 형식이 맞지 않는 항목이 있어요. 데이터를 확인해 주세요.",
}

export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : ""
  return MESSAGES[code] ?? "잠시 후 다시 시도해 주세요."
}

import type { ProjectGraph } from "@/lib/types/assembler"

// 개발용 시드 그래프 — Object Tree가 빈 화면 없이 바로 계층을 보여주기 위한 예시.
// AI Prompt 생성(다음 슬라이스)이 붙으면 loadGraph(생성결과)로 대체된다. 운영 데이터 아님.
// 의도적으로 미참조 객체(legacy_logs DB)를 하나 넣어 고립 ⚠ 배지를 검증한다.

export const SAMPLE_GRAPH: ProjectGraph = {
  id: "sample",
  name: "쇼핑몰 예시",
  description: "Object Tree 렌더 검증용 시드 그래프",
  requirements: [
    {
      id: "req-auth",
      title: "사용자는 가입하고 로그인할 수 있어야 한다",
      description: "이메일 기반 인증으로 계정을 만들고 접근한다.",
      links: [{ label: "Notion", url: "https://notion.so/auth-policy" }],
    },
  ],
  features: [
    {
      id: "feat-login",
      name: "로그인",
      description: "이메일과 비밀번호로 인증한다.",
      businessRules: ["5회 실패 시 잠금", "세션 30일 유지"],
      requirementIds: ["req-auth"],
      pageIds: ["page-login"],
      apiIds: ["api-login"],
      databaseIds: ["db-sessions"],
      links: [{ label: "Jira", url: "https://jira/browse/AUTH-12" }],
    },
    {
      id: "feat-reset",
      name: "비밀번호 재설정",
      description: "이메일 링크로 비밀번호를 다시 설정한다.",
      businessRules: ["링크 10분 만료"],
      requirementIds: ["req-auth"],
      pageIds: [],
      apiIds: [],
      databaseIds: [],
    },
  ],
  pages: [
    {
      id: "page-login",
      name: "로그인 페이지",
      description: "사용자가 자격 증명을 입력한다.",
      featureIds: ["feat-login"],
      wireframeId: "wf-login",
      apiIds: ["api-login"],
      databaseIds: ["db-sessions"],
      x: 0,
      y: 0,
      links: [{ label: "Figma", url: "https://figma.com/file/login-frame" }],
    },
  ],
  wireframes: [
    {
      id: "wf-login",
      pageId: "page-login",
      uiElementIds: ["el-email", "el-submit", "el-deco"],
    },
  ],
  uiElements: [
    {
      id: "el-email",
      name: "이메일 입력",
      description: "로그인 식별자를 입력받는다.",
      type: "text-input",
      props: { placeholder: "이메일을 입력해 주세요" },
      states: [
        { label: "Default" },
        { label: "Error", detail: "형식이 올바르지 않을 때" },
      ],
      action: "Input",
      apiIds: [],
      databaseIds: [],
      result: { kind: "stateChange", detail: "입력값 유효성 표시" },
    },
    {
      id: "el-submit",
      name: "로그인 버튼",
      description: "자격 증명을 검증해 세션을 만든다.",
      type: "button",
      props: { label: "로그인하기", variant: "solid" },
      states: [{ label: "Default" }, { label: "Loading" }],
      action: "Click",
      apiIds: ["api-login"],
      databaseIds: ["db-sessions"],
      result: { kind: "navigate", toPageId: "page-login", detail: "성공 시 홈으로" },
    },
    {
      id: "el-deco",
      name: "안내 문구",
      description: "로그인 도움말 텍스트.",
      type: "text",
      props: { text: "비밀번호를 잊었다면 재설정해 주세요" },
      states: [{ label: "Default" }],
      action: "None",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
  ],
  apis: [
    {
      id: "api-login",
      method: "POST",
      path: "/auth/login",
      purpose: "이메일·비밀번호를 검증하고 세션을 발급한다.",
      databaseIds: ["db-sessions"],
      success: "세션 발급 — 홈으로 이동",
      error: "자격 증명 불일치 — 인라인 에러",
      links: [{ label: "Confluence", url: "https://confluence/api/login-spec" }],
    },
  ],
  databases: [
    {
      id: "db-sessions",
      name: "wf_sessions",
      purpose: "로그인 세션 토큰을 저장한다.",
      columns: ["session_id — 토큰", "user_id — 사용자 참조", "expires_at — 만료"],
    },
    {
      id: "db-legacy-logs",
      name: "legacy_logs",
      purpose: "어디서도 참조하지 않는 미연결 테이블(고립 배지 검증용).",
      columns: [],
    },
  ],
  pageFlows: [],
  userFlow: { id: "uf", edges: [] },
}

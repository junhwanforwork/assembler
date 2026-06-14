import type { ProjectGraph } from "@/lib/types/assembler"

// 캔버스(ASS-033/034)·정규화(ASS-019) 개발용 시드 그래프.
// 모킹이 아니라 ProjectGraph 타입을 그대로 만족하는 픽스처다 — 진짜 store/렌더가 진짜 데이터로 동작한다.
// 의도적으로 캔버스 분기를 자극하도록 구성:
//  - 페이지 2개(Login→MyPage) + navigate 엣지 1개 (navigate↔UserFlowEdge 정합)
//  - 요소 타입 다양화(text-input·button·text·badge)로 BlockRenderer 분기 검증
//  - Password Input은 states/action 비움 → isMappingComplete=false(⚠ 표시) 검증용
//  - id는 가독성 위해 의미 있는 슬러그 사용(타입은 string) — dangling 0

export const SAMPLE_GRAPH: ProjectGraph = {
  id: "graph-demo",
  name: "데모 — 로그인 & 마이페이지",
  description: "캔버스 개발용 시드. 로그인 후 마이페이지로 이동하는 최소 플로우.",

  requirements: [
    {
      id: "req-login",
      title: "사용자는 로그인할 수 있어야 한다.",
      description: "이메일과 비밀번호로 인증해 마이페이지에 접근한다.",
    },
  ],

  features: [
    {
      id: "feat-login",
      name: "Login",
      description: "이메일/비밀번호 인증 기능.",
      businessRules: [
        "비밀번호 5회 연속 실패 시 잠금 — 정책 확인 필요.",
        "인증 성공 시 마이페이지로 이동한다.",
      ],
      requirementIds: ["req-login"],
      pageIds: ["page-login", "page-mypage"],
      apiIds: ["api-login"],
      databaseIds: ["db-users"],
    },
  ],

  pages: [
    {
      id: "page-login",
      name: "Login",
      description: "이메일/비밀번호 입력 화면.",
      featureIds: ["feat-login"],
      wireframeId: "wf-login",
      apiIds: ["api-login"],
      databaseIds: ["db-users"],
      x: 40,
      y: 40,
      device: "mobile",
    },
    {
      id: "page-mypage",
      name: "MyPage",
      description: "로그인 후 진입하는 개인 화면.",
      featureIds: ["feat-login"],
      wireframeId: "wf-mypage",
      apiIds: [],
      databaseIds: [],
      x: 460,
      y: 40,
      device: "mobile",
    },
  ],

  wireframes: [
    {
      id: "wf-login",
      pageId: "page-login",
      uiElementIds: ["el-email", "el-password", "el-submit", "el-hint"],
    },
    {
      id: "wf-mypage",
      pageId: "page-mypage",
      uiElementIds: ["el-welcome", "el-status"],
    },
  ],

  uiElements: [
    {
      id: "el-email",
      name: "Email Input",
      description: "로그인 이메일을 입력받는다.",
      type: "text-input",
      props: { label: "이메일", placeholder: "name@example.com" },
      states: [{ label: "Default" }, { label: "Error", detail: "형식 오류 시" }],
      action: "Input",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
    {
      // 의도적 미완성 — states·action 비움으로 ⚠(isMappingComplete=false) 표시 검증.
      id: "el-password",
      name: "Password Input",
      description: "로그인 비밀번호를 입력받는다.",
      type: "text-input",
      props: { label: "비밀번호", placeholder: "비밀번호" },
      states: [],
      action: "",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
    {
      id: "el-submit",
      name: "Login Button",
      description: "입력값으로 인증을 시도한다.",
      type: "button",
      props: { label: "로그인하기", variant: "solid" },
      states: [
        { label: "Default" },
        { label: "Loading", detail: "인증 중 비활성" },
        { label: "Disabled", detail: "이메일·비밀번호 미입력 시" },
      ],
      action: "Click",
      apiIds: ["api-login"],
      databaseIds: ["db-users"],
      result: { kind: "navigate", toPageId: "page-mypage", detail: "인증 성공 시 마이페이지로" },
    },
    {
      id: "el-hint",
      name: "Signup Hint",
      description: "가입 안내 문구 — 장식 요소.",
      type: "text",
      props: { text: "아직 계정이 없으세요?" },
      states: [{ label: "Default" }],
      action: "",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
    {
      id: "el-welcome",
      name: "Welcome Message",
      description: "로그인한 사용자 환영 문구.",
      type: "text",
      props: { text: "환영해요!" },
      states: [{ label: "Default" }],
      action: "",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
    {
      id: "el-status",
      name: "Status Badge",
      description: "계정 상태 표시.",
      type: "badge",
      props: { text: "활성", status: "positive" },
      states: [{ label: "Default" }],
      action: "",
      apiIds: [],
      databaseIds: [],
      result: { kind: "none" },
    },
  ],

  apis: [
    {
      id: "api-login",
      method: "POST",
      path: "/login",
      purpose: "이메일·비밀번호로 사용자를 인증한다.",
      databaseIds: ["db-users"],
      success: "User Authenticated",
      error: "이메일 또는 비밀번호 불일치 — 인라인 에러 노출",
    },
  ],

  databases: [
    {
      id: "db-users",
      name: "users",
      purpose: "사용자 계정 저장.",
      columns: ["email — 로그인 식별자", "password_hash — 비밀번호 해시"],
    },
  ],

  pageFlows: [
    {
      id: "flow-login",
      pageId: "page-login",
      steps: [
        { id: "step-enter", label: "화면 진입", nextStepIds: ["step-input"] },
        { id: "step-input", label: "이메일·비밀번호 입력", nextStepIds: ["step-submit"] },
        { id: "step-submit", label: "로그인 시도", nextStepIds: ["step-navigate"] },
        { id: "step-navigate", label: "마이페이지로 이동", nextStepIds: [] },
      ],
    },
  ],

  userFlow: {
    id: "userflow-demo",
    edges: [
      {
        id: "edge-login-to-mypage",
        fromPageId: "page-login",
        toPageId: "page-mypage",
        triggerElementId: "el-submit",
        condition: "인증 성공 시",
      },
    ],
  },
}

// Assembler 객체 그래프 타입 — 단일 출처: .claude/rules/assembler/object-model.md
// 추후 wf_projects.document(jsonb)에 직렬화되므로 interface가 아닌 type으로 선언한다
// (interface는 암묵적 인덱스 시그니처가 없어 Supabase Json 제약에 할당 불가 — src/lib/supabase/builder.ts 참고).
// 연결은 id 참조로만, 역참조(Used By)는 파생이므로 저장 필드로 두지 않는다.
// 선언 순서는 object-model.md 섹션 순서를 따른다 (보조 타입은 부모 직전).
// 직렬화 루트는 파일 말미의 ProjectGraph — 그래프 전체 구조의 진입점.

/** Requirement — WHY. 프로젝트 전체에 영향을 주는 전역 요구사항.
 * 충족 Feature 목록은 저장하지 않는다 — Feature.requirementIds에서 파생(조회 시 계산). */
export type Requirement = {
  id: string
  title: string
  description: string
}

/** Feature — WHAT. 독립 기능 단위, 여러 Page에 걸칠 수 있다. */
export type Feature = {
  id: string
  name: string
  description: string
  /** 세부 규칙은 Requirement가 아닌 여기에 둔다 (object-model.md). */
  businessRules: string[]
  /** 충족하는 Requirement. */
  requirementIds: string[]
  /** 관련 Page (N:N). */
  pageIds: string[]
  /** 관련 API. */
  apiIds: string[]
  /** 관련 Database. */
  databaseIds: string[]
}

/** Page — WHERE. 사용자 상호작용 장소.
 * Wireframe은 Page만 소유한다 — Feature에 직접 붙이지 않는다 (카디널 룰). */
export type Page = {
  id: string
  name: string
  description: string
  /** 이 Page가 구현하는 Feature (N:N). */
  featureIds: string[]
  /** 소유 Wireframe (1:1, 필수). 불일치 시 Wireframe.pageId가 출처. */
  wireframeId: string
  /** Page 내부 Flow (선택). PageFlow.pageId와 불일치 시 PageFlow.pageId가 출처 — 정합 검증은 ASS-019. */
  pageFlowId?: string
  /** 사용 API. */
  apiIds: string[]
  /** 사용 Database. */
  databaseIds: string[]
  /** 캔버스 좌표 — 표현용 (도메인 아님). AI 미생성 — 정규화(ASS-019)가 그리드 배치로 채움. 빌더 Screen.x/y 선례, FlowCanvas 재사용 전제 (ASS-033). */
  x: number
  y: number
}

/** Wireframe — Page 소유 (1:1). 그림이 아니라 UI Element들의 순서 있는 집합 — 배열 순서 = 세로 스택 렌더 순서. */
export type Wireframe = {
  id: string
  /** 소유 Page. 불일치 시 Wireframe.pageId가 출처 (object-model.md 무결성 절). */
  pageId: string
  uiElementIds: string[]
}

/** UI Element 종류의 단일 출처 — 생성 프롬프트가 이 배열에서 파생(리터럴 산재 방지). */
export const UI_ELEMENT_TYPES = [
  "heading", "text", "button", "text-input", "textarea",
  "dropdown", "toggle", "badge", "number-stepper", "divider",
] as const

/** UI Element 종류의 정본. builder `BlockType`이 이 타입으로 re-point됨(ASS-016 완료,
 * 의존 방향: builder→assembler) — BlockRenderer 재사용 전제(ASS-034). */
export type UIElementType = (typeof UI_ELEMENT_TYPES)[number]

/** UI 상태 한 줄. 예: { label: "Loading", detail: "제출 중 비활성" }. */
export type UIElementState = {
  label: string
  detail?: string
}

/** "다음에 무엇이 일어나는가" — mapping.md 5종. 장식 요소도 none 명시 필수. */
export type UIElementResult =
  | { kind: "navigate"; toPageId: string; detail?: string }
  | { kind: "stateChange"; detail: string }
  | { kind: "toast"; detail: string }
  | { kind: "inlineError"; detail: string }
  | { kind: "none" }

/** UIElement — 모든 요소는 비즈니스 의미를 가진다 (카디널 룰 3). */
export type UIElement = {
  id: string
  /** 명사구. 예: "Login Button" */
  name: string
  description: string
  type: UIElementType
  /** 렌더 속성 (block-catalog 스키마 — 버튼 label, 입력 placeholder 등). */
  props: Record<string, unknown>
  states: UIElementState[]
  /** Click / Input / Select / Change / Toggle … */
  action: string
  /** 호출 API (N:N). */
  apiIds: string[]
  /** 영향 DB (N:N). */
  databaseIds: string[]
  result: UIElementResult
}

/** HTTP 메서드의 단일 출처 — 생성 프롬프트가 이 배열에서 파생(리터럴 산재 방지), enum 검증(ASS-019)도 여기서. */
export const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

/** API_METHODS 파생 유니온 — 제품 스펙 용도라 5종이면 충분 (HEAD/OPTIONS 불필요). */
export type ApiMethod = (typeof API_METHODS)[number]

/** Api — 전역 공유 객체. 엔드포인트뿐 아니라 목적(purpose)을 적는다 — PM·디자이너·개발자 모두 이해 가능해야 한다.
 * 역참조 triggeredByElementIds/usedInPageIds는 파생 — UIElement.apiIds/Page.apiIds에서 조회 시 계산, 저장하지 않는다.
 * success/error는 사람용 설명 텍스트 — 화면 결과의 그래프 연결 출처는 UIElement.result(구조화 유니온)다.
 * 카디널리티: Api N — N UIElement, Api N — N Database. */
export type Api = {
  id: string
  method: ApiMethod
  path: string
  purpose: string
  /** 사용하는 Database (N:N). */
  databaseIds: string[]
  /** 성공 결과 설명. 예: "User Created" */
  success: string
  /** 실패 결과 설명. 예: "이메일 중복 — 인라인 에러" */
  error: string
}

/** Database — 전역 공유 객체.
 * 역참조 usedByFeatureIds/relatedApiIds는 파생 — Feature.databaseIds/Api.databaseIds에서 조회 시 계산, 저장하지 않는다. */
export type Database = {
  id: string
  /** 테이블명. */
  name: string
  purpose: string
  /** 컬럼 설명 문자열. 예: "email — 로그인 식별자". 빈 배열 = 컬럼 미기재 (optional 대신 균질 직렬화 — ASS-019 [] 채움 정책과 정렬). */
  columns: string[]
}

/** PageFlow의 한 단계. nextStepIds는 같은 PageFlow 내 step id 참조 — 분기 가능. */
export type PageFlowStep = {
  id: string
  label: string
  nextStepIds: string[]
}

/** PageFlow — Page 내부 journey. 예: Enter → Input → Submit → Success → Navigate.
 * 카디널리티: Page 1 — 1 PageFlow (선택적 소유, Page.pageFlowId). */
export type PageFlow = {
  id: string
  /** 소유 Page. */
  pageId: string
  /** steps[0] = 진입 단계 (flow.md 규약). */
  steps: PageFlowStep[]
}

/** UserFlow의 한 엣지 — Page→Page 이동. "화면 간 이동"의 단일 출처 (flow.md). */
export type UserFlowEdge = {
  id: string
  fromPageId: string
  toPageId: string
  /** 이동을 일으킨 UI Element (예: Submit Button) — Mapping과 연결. */
  triggerElementId?: string
  /** 조건부 이동. 예: "가입 성공 시". */
  condition?: string
}

/** UserFlow — 전역 Page↔Page 네비게이션 그래프. 프로젝트당 1개.
 * UIElement.result가 navigate면 대응 edge가 반드시 존재해야 한다 (정합 검증 ASS-019). */
export type UserFlow = {
  /** 공통 규칙(모든 객체 id 보유) 준수용 — 싱글톤이라 참조처 없음. */
  id: string
  edges: UserFlowEdge[]
}

/** ProjectGraph — 프로젝트 전체 그래프. wf_projects.document(jsonb)에 통째로 직렬화 (구 ProjectDocument 대체).
 * 컬렉션 배열이 멤버십·순서의 정본 — Project의 id 배열 목록은 두지 않는다 (이중 저장 드리프트 방지, ASS-011 원칙).
 * Mapping은 별도 저장 객체가 아니다 — UIElement의 apiIds/databaseIds/result + UserFlow edge가 Mapping이다 (mapping.md).
 * 모든 객체는 평면 컬렉션 저장 — 소유(Page 종속 등)는 id 참조로 표현한다 (중첩 금지 규칙). */
export type ProjectGraph = {
  id: string
  name: string
  description: string
  requirements: Requirement[]
  features: Feature[]
  pages: Page[]
  wireframes: Wireframe[]
  uiElements: UIElement[]
  apis: Api[]
  databases: Database[]
  pageFlows: PageFlow[]
  /** 프로젝트당 1개. 누락 시 정규화(ASS-019)가 빈 UserFlow(edges: [])를 채움 — optional이면 "부재 vs 빈 배열" 제3 상태가 생겨 균질 직렬화 원칙(columns 선례) 위반. */
  userFlow: UserFlow
}

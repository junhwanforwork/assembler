// Assembler 객체 그래프 타입 — 단일 출처: .claude/rules/assembler/object-model.md
// 추후 wf_projects.document(jsonb)에 직렬화되므로 interface가 아닌 type으로 선언한다
// (interface는 암묵적 인덱스 시그니처가 없어 Supabase Json 제약에 할당 불가 — src/lib/supabase/builder.ts 참고).
// 연결은 id 참조로만, 역참조(Used By)는 파생이므로 저장 필드로 두지 않는다.

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
  /** 관련 API. Api 타입은 ASS-014에서 추가 예정. */
  apiIds: string[]
  /** 관련 Database. Database 타입은 ASS-014에서 추가 예정. */
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
  /** 소유 Wireframe (1:1, 필수). Wireframe 타입은 ASS-013에서 추가 예정. */
  wireframeId: string
  /** Page 내부 Flow (선택). PageFlow.pageId와 불일치 시 PageFlow.pageId가 출처 — 정합 검증은 ASS-019. */
  pageFlowId?: string
  /** 사용 API. Api 타입은 ASS-014에서 추가 예정. */
  apiIds: string[]
  /** 사용 Database. Database 타입은 ASS-014에서 추가 예정. */
  databaseIds: string[]
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

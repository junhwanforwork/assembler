// Assembler 데이터 모델 — 단일 출처.
// 핵심개념: 아이디어 → 연결된 구조. "사용자가 이걸 하면, 다음에 무엇이 일어나는가?"
// 두 레이어:
//   A. 코드-진실(code-truth) — 코드/MCP에서 싱크. Assembler 안에서는 읽기전용(사용자 추가/편집 X).
//   B. 저작(authored) — 사용자가 Assembler에서 설계.
// 연결은 전부 id 참조. 무결성은 design.ts(findDanglingRefs)가 강제한다.

// ───────────────────────── 공통 ─────────────────────────

// 코드-진실이 어디서 들어왔는지. 사용자가 만든 게 아님을 표시.
export type SourceKind = "code" | "mcp"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

// ─────────────────── A. 코드-진실 (읽기전용) ───────────────────

export type ApiStatus = "planned" | "active" | "deprecated"

// Product 전역(Shared). 여러 Workspace의 Feature·UIElement가 id로 참조한다.
export type Api = {
  id: string
  productId: string
  method: HttpMethod
  endpoint: string
  summary: string
  status: ApiStatus
  source: SourceKind
}

export type DbColumn = {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  // FK가 있으면 "table.column" 형태. 없으면 생략.
  references?: string
}

// Product 전역(Shared).
export type DbTable = {
  id: string
  productId: string
  name: string
  description: string
  columns: DbColumn[]
  source: SourceKind
}

// ─────────────────── B. 저작 — 스파인 ───────────────────

// 최상위 컨테이너.
export type Product = {
  id: string
  name: string
  description: string
}

// Product 하위의 독립 작업 공간. Shared(api·db·asset·prompt)를 공유한다.
// isMain=true 가 기본 워크스페이스(Main). git-merge 개념 없음 — 서로 독립.
export type Workspace = {
  id: string
  productId: string
  name: string
  isMain: boolean
}

// ─────────────────── B. 저작 — 디자인 그래프 (Workspace별) ───────────────────

export type RequirementStatus = "draft" | "approved" | "deprecated"
export type Priority = "low" | "medium" | "high"

// WHY — 전역 요구사항.
export type Requirement = {
  id: string
  title: string
  description: string
  status: RequirementStatus
  priority: Priority
  role: string
  acceptanceCriteria: string[]
}

export type DetailFeature = {
  id: string
  title: string
  description: string
}

// WHAT — 기능. Requirement(why)·Page(where)·Api(code-truth)로 연결된다.
export type Feature = {
  id: string
  name: string
  description: string
  detailFeatures: DetailFeature[]
  requirementIds: string[]
  pageIds: string[]
  apiIds: string[]
}

// WHERE — 화면. Wireframe을 소유한다(카디널 룰 2). 1:1, 없으면 null.
export type Page = {
  id: string
  name: string
  description: string
  wireframeId: string | null
}

// Page↔Page 네비게이션 한 가닥.
export type FlowEdge = {
  id: string
  fromPageId: string
  toPageId: string
  // 무엇이 이 이동을 일으키나. "로그인 성공 시"
  trigger: string
}

export type Flow = {
  id: string
  name: string
  edges: FlowEdge[]
}

// Page 소유. UIElement들의 집합.
export type Wireframe = {
  id: string
  elementIds: string[]
}

export type ElementState = {
  name: string
  description: string
}

// 모든 UI Element는 Mapping을 가진다(카디널 룰 3):
// State · Action · API · Database · Result.
export type UIElement = {
  id: string
  label: string
  type: string
  // "사용자가 이걸 하면 무엇이 일어나는가"
  action: string
  states: ElementState[]
  result: string
  apiIds: string[]
  dbTableIds: string[]
}

// Workspace별 디자인 그래프. 영속에서는 workspaces.design(JSONB)에 통째로 저장.
export type WorkspaceDesign = {
  requirements: Requirement[]
  features: Feature[]
  pages: Page[]
  flows: Flow[]
  wireframes: Wireframe[]
  elements: UIElement[]
}

// ─────────────────── B. 저작 — Shared 리소스 ───────────────────

export type Asset = {
  id: string
  productId: string
  name: string
  url: string
}

export type Prompt = {
  id: string
  productId: string
  name: string
  body: string
}

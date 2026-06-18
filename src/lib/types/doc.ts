// 협업 워크스페이스 문서 트리 타입.
// 프로젝트 전체를 자유 트리(폴더/문서)로 다루며, wf_projects.document(jsonb)에 직렬화한다.

// type으로 선언한다(interface 금지) — DocContent가 ProjectGraph(assembler.ts)에 inline으로 들어가며,
// ProjectGraph는 wf_projects.document(jsonb) 직렬화 제약상 전부 type이어야 한다(assembler.ts 헤더 참고).

/** UX Spec Writer 구조: 컴포넌트 단위 상태/동작/결과. */
export type SpecComponent = {
  name: string
  description?: string
  /** Default / Disabled / Loading / Empty / Error / Negative 등 UI 상태. */
  states: SpecLine[]
  /** 클릭/선택/입력/변경 시 등 사용자 동작. */
  actions: SpecAction[]
  /** Success / Negative 등 시스템 결과. */
  results: SpecLine[]
}

export type SpecLine = {
  label: string
  detail: string
}

export type SpecAction = {
  trigger: string
  detail: string
}

/** 문서 본문: 구조화 명세 + 마크다운 설명(조합). */
export type DocContent = {
  markdown?: string
  spec?: SpecComponent[]
}

export type NodeType = "folder" | "doc"
export type DocKind = "spec" | "markdown"

/** 자유 트리의 단일 노드(폴더 또는 문서). 평면 배열 + parentId로 관리. */
export interface DocNode {
  id: string
  parentId: string | null
  type: NodeType
  name: string
  /** 같은 부모 안에서의 정렬 순서. */
  order: number
  /** type === "doc"일 때만. spec=구조화폼+마크다운, markdown=마크다운만. */
  docKind?: DocKind
  content?: DocContent
}

export const EMPTY_SPEC_COMPONENT: SpecComponent = {
  name: "",
  states: [],
  actions: [],
  results: [],
}

// UX 빌더 도메인 타입.
// 프로젝트 전체를 단일 문서(document)로 들고 다니며, 저장 시 jsonb 컬럼에 통째로 직렬화한다.

/** 캔버스에 올릴 수 있는 DS 블록 종류. OPINION 디자인 시스템 컴포넌트와 매핑된다. */
export type BlockType =
  | "heading"
  | "text"
  | "button"
  | "text-input"
  | "textarea"
  | "dropdown"
  | "toggle"
  | "badge"
  | "number-stepper"
  | "divider"

/** 화면 안에 세로로 쌓이는 단일 컴포넌트 인스턴스. 배열 순서가 곧 스택 순서. */
export interface Block {
  id: string
  type: BlockType
  /** 블록 타입별 속성(label, placeholder 등). 타입별 스키마는 block-catalog에서 정의. */
  props: Record<string, unknown>
}

/** 와이어프레임 화면 한 장. blocks는 세로 스택, x/y는 플로우 뷰에서의 노드 위치. */
export interface Screen {
  id: string
  title: string
  blocks: Block[]
  x: number
  y: number
}

/** 화면 → 화면 전환 엣지. 특정 블록(버튼 등)이 트리거가 될 수 있음. */
export interface Flow {
  id: string
  sourceScreenId: string
  targetScreenId: string
  triggerBlockId?: string
  label?: string
}

/** 프로젝트의 직렬화 가능한 본문. wf_projects.document(jsonb)에 그대로 저장된다. */
export interface ProjectDocument {
  screens: Screen[]
  flows: Flow[]
}

/** 단일 프로젝트(문서 모델). */
export interface Project {
  id: string
  sessionId: string
  title: string
  document: ProjectDocument
  createdAt: string
  updatedAt: string
}

/** 프로젝트 목록 카드에 필요한 경량 요약. */
export interface ProjectListItem {
  id: string
  title: string
  screenCount: number
  updatedAt: string
}

export const EMPTY_DOCUMENT: ProjectDocument = { screens: [], flows: [] }

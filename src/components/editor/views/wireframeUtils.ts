import type { Api, DbTable, UIElement, Wireframe, WorkspaceDesign } from "@/lib/types/assembler"

// ── 와이어프레임 구조 렌더(ASM-034) — 페이지별 UIElement 세로 스택 조립. flowUtils와 같은 순수 함수 계열. ──

// 페이지 카드 하나가 그리는 스택. orphan 와이어프레임(소유 페이지 없음)도 스택으로 승격해 숨기지 않는다.
export type WireframeStack = {
  // 렌더 key — 페이지 스택은 page id, orphan 스택은 wireframe id.
  key: string
  title: string
  pageId: string | null
  description: string
  // 페이지가 렌더 가능한 와이어프레임을 연결했는가. wireframeId가 null이거나 dangling이면 false.
  hasWireframe: boolean
  elements: UIElement[]
  // 걸러낸 dangling elementId 수 — "다 보여주고 있다"로 읽히지 않게 정직 표시용.
  danglingCount: number
}

// planImpact.ts:45와 동일한 폴백 카피 — 소유 페이지가 없는 와이어프레임의 이름.
const ORPHAN_WIREFRAME_TITLE = "이름 없는 와이어프레임"

function resolveElements(wireframe: Wireframe, byId: Map<string, UIElement>): { elements: UIElement[]; danglingCount: number } {
  const elements: UIElement[] = []
  const seen = new Set<string>()
  let danglingCount = 0
  for (const id of wireframe.elementIds) {
    // 중복 id는 같은 요소의 재등장 — 렌더 key 충돌을 막기 위해 한 번만 통과(dangling 아님).
    if (seen.has(id)) continue
    seen.add(id)
    const el = byId.get(id)
    if (el) elements.push(el)
    else danglingCount += 1
  }
  return { elements, danglingCount }
}

export function buildWireframeStacks(design: WorkspaceDesign): WireframeStack[] {
  const wireframeById = new Map(design.wireframes.map((w) => [w.id, w]))
  const elementById = new Map(design.elements.map((e) => [e.id, e]))

  const ownedWireframeIds = new Set<string>()
  const stacks: WireframeStack[] = []

  for (const page of design.pages) {
    const wireframe = page.wireframeId ? wireframeById.get(page.wireframeId) : undefined
    if (wireframe) ownedWireframeIds.add(wireframe.id)
    const { elements, danglingCount } = wireframe
      ? resolveElements(wireframe, elementById)
      : { elements: [], danglingCount: 0 }
    stacks.push({
      key: page.id,
      title: page.name,
      pageId: page.id,
      description: page.description,
      hasWireframe: !!wireframe,
      elements,
      danglingCount,
    })
  }

  for (const wireframe of design.wireframes) {
    if (ownedWireframeIds.has(wireframe.id)) continue
    const { elements, danglingCount } = resolveElements(wireframe, elementById)
    stacks.push({
      key: wireframe.id,
      title: ORPHAN_WIREFRAME_TITLE,
      pageId: null,
      description: "",
      hasWireframe: true,
      elements,
      danglingCount,
    })
  }

  return stacks
}

// ── #46 인스펙터 — 연결 id를 코드-진실 이름으로 해석. dangling은 raw id 노출 없이 개수만(정직 표시). ──

export type ElementLinkResolution = {
  names: string[]
  missingCount: number
}

function resolveLinks<T>(ids: string[], byId: Map<string, T>, name: (item: T) => string): ElementLinkResolution {
  const names: string[] = []
  const seen = new Set<string>()
  let missingCount = 0
  for (const id of ids) {
    // 중복 id는 같은 연결의 재등장 — 태그 중복 렌더를 막기 위해 한 번만 통과.
    if (seen.has(id)) continue
    seen.add(id)
    const item = byId.get(id)
    if (item) names.push(name(item))
    else missingCount += 1
  }
  return { names, missingCount }
}

export function resolveElementApis(element: UIElement, apis: Api[]): ElementLinkResolution {
  // 표기는 dataUtils.buildTableDetail과 동일한 "METHOD endpoint".
  return resolveLinks(element.apiIds, new Map(apis.map((a) => [a.id, a])), (a) => `${a.method} ${a.endpoint}`)
}

export function resolveElementDbTables(element: UIElement, dbTables: DbTable[]): ElementLinkResolution {
  return resolveLinks(element.dbTableIds, new Map(dbTables.map((t) => [t.id, t])), (t) => t.name)
}

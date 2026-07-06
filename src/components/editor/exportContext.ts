import type { Api, DbTable, Flow, Page, Requirement, UIElement, WorkspaceDesign } from "@/lib/types/assembler"

// 내보내기 — 구현 컨텍스트 패키징(#64). 선택 기능(1~N개)의 연결된 명세를 코딩 에이전트용
// 프롬프트(.md)로 만든다. 계약 3가지:
//  1) 선택 기능에 연결된 것만 — 스펙 전체 덤프 금지.
//  2) 재사용/신규 구분 — 환각 방지 핵심. Api.source는 타입상 항상 code|mcp(코드-진실)라서
//     "코드에 있음" 판정은 status로 한다: active·deprecated=재사용(이미 존재), planned=신규(계획만 존재).
//  3) 끊어진 참조(고아 id)는 "연결 끊김"으로 정직하게 표기 — 이름을 지어내지 않는다.

export type ExportContextInput = {
  workspaceName: string
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
}

// #34 — 벌크 체크된 요구사항에 연결된 기능 프리셀렉트.
export function connectedFeatureIds(design: WorkspaceDesign, requirementIds: string[]): string[] {
  if (requirementIds.length === 0) return []
  const checked = new Set(requirementIds)
  return design.features.filter((f) => f.requirementIds.some((id) => checked.has(id))).map((f) => f.id)
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function sourceBadge(source: "code" | "mcp"): string {
  return source === "code" ? "⎇ code" : "✶ mcp"
}

function apiLine(api: Api): string {
  const warn = api.status === "deprecated" ? " — ⚠ 중단(deprecated) 예정이라 대체 여부를 확인할 것" : ""
  const summary = api.summary ? ` — ${api.summary}` : ""
  return `- \`${api.method} ${api.endpoint}\` (${sourceBadge(api.source)} · ${api.status})${summary}${warn}`
}

function columnSummary(table: DbTable): string {
  if (table.columns.length === 0) return "(컬럼 정보 없음)"
  return table.columns
    .map((c) => {
      const marks = [c.isPrimaryKey && "PK", c.nullable && "nullable", c.references && `→ ${c.references}`]
        .filter(Boolean)
        .join(" ")
      return `${c.name} ${c.type}${marks ? ` ${marks}` : ""}`
    })
    .join(" · ")
}

function elementLine(el: UIElement, apiById: Map<string, Api>, dbById: Map<string, DbTable>, broken: Set<string>): string {
  const apiRefs = el.apiIds.map((id) => {
    const api = apiById.get(id)
    if (!api) broken.add(`요소 "${el.label}"이 참조하는 API \`${id}\`가 코드-진실에 없음`)
    return api ? `${api.method} ${api.endpoint}` : null
  })
  const dbRefs = el.dbTableIds.map((id) => {
    const table = dbById.get(id)
    if (!table) broken.add(`요소 "${el.label}"이 참조하는 DB 테이블 \`${id}\`가 코드-진실에 없음`)
    return table ? table.name : null
  })
  const mappings = [
    apiRefs.filter(Boolean).length > 0 && `API: ${apiRefs.filter(Boolean).join(", ")}`,
    dbRefs.filter(Boolean).length > 0 && `DB: ${dbRefs.filter(Boolean).join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ")
  const states =
    el.states.length > 0
      ? `\n  - 상태: ${el.states.map((st) => (st.description ? `${st.name}(${st.description})` : st.name)).join(", ")}`
      : ""
  return `- **${el.label}** (${el.type}) — ${el.action} → ${el.result}${mappings ? ` · ${mappings}` : ""}${states}`
}

// 선택 기능의 화면을 지나는(출발 또는 도착) edge만 — 화면 이름과 트리거로 경로를 그린다.
function flowSection(flows: Flow[], selectedPageIds: Set<string>, pageById: Map<string, Page>): string[] {
  const lines: string[] = []
  for (const flow of flows) {
    const edges = flow.edges.filter((e) => selectedPageIds.has(e.fromPageId) || selectedPageIds.has(e.toPageId))
    if (edges.length === 0) continue
    lines.push(`### ${flow.name}`)
    for (const edge of edges) {
      const from = pageById.get(edge.fromPageId)?.name ?? `(없는 화면 ${edge.fromPageId})`
      const to = pageById.get(edge.toPageId)?.name ?? `(없는 화면 ${edge.toPageId})`
      lines.push(`- ${from} → ${to} — ${edge.trigger}`)
    }
  }
  if (lines.length === 0) lines.push("- (선택한 기능의 화면을 지나는 플로우 없음)")
  return lines
}

export function buildImplementationContext(input: ExportContextInput, selectedFeatureIds: string[]): string {
  const { design, apis, dbTables } = input
  const selectedSet = new Set(selectedFeatureIds)
  const features = design.features.filter((f) => selectedSet.has(f.id))

  const reqById = byId(design.requirements)
  const pageById = byId(design.pages)
  const wireframeById = byId(design.wireframes)
  const elementById = byId(design.elements)
  const apiById = byId(apis)
  const dbById = byId(dbTables)

  // Set — 공유 와이어프레임/요소 같은 손상 데이터에서도 같은 항목이 중복 출력되지 않게.
  const broken = new Set<string>()

  // 연결 수집 — 전부 선택 기능에서 출발한다(스펙 전체 덤프 금지).
  const requirements = new Map<string, Requirement>()
  const pages = new Map<string, Page>()
  const referencedApiIds = new Set<string>()

  for (const feature of features) {
    for (const reqId of feature.requirementIds) {
      const req = reqById.get(reqId)
      if (req) requirements.set(req.id, req)
      else broken.add(`기능 "${feature.name}"이 참조하는 요구사항 \`${reqId}\`가 스펙에 없음`)
    }
    for (const pageId of feature.pageIds) {
      const page = pageById.get(pageId)
      if (page) pages.set(page.id, page)
      else broken.add(`기능 "${feature.name}"이 참조하는 화면 \`${pageId}\`가 스펙에 없음`)
    }
    for (const apiId of feature.apiIds) {
      if (apiById.has(apiId)) referencedApiIds.add(apiId)
      else broken.add(`기능 "${feature.name}"이 참조하는 API \`${apiId}\`가 코드-진실에 없음`)
    }
  }

  // 화면 → 와이어프레임 → 요소. 요소의 API·DB 매핑도 참조 집합에 합류.
  const pageElements = new Map<string, UIElement[]>()
  const referencedTables = new Map<string, DbTable>()

  // ASM-052 승격 — 기능이 DB 연결의 1급 주인. 와이어 후퇴 후 새 그래프는 이 경로로만 테이블이 잡힌다.
  for (const feature of features) {
    for (const dbId of feature.dbTableIds ?? []) {
      const table = dbById.get(dbId)
      if (table) referencedTables.set(table.id, table)
      else broken.add(`기능 "${feature.name}"이 참조하는 DB 테이블 \`${dbId}\`가 코드-진실에 없음`)
    }
  }

  for (const page of pages.values()) {
    if (!page.wireframeId) continue
    const wireframe = wireframeById.get(page.wireframeId)
    if (!wireframe) {
      broken.add(`화면 "${page.name}"이 참조하는 와이어프레임 \`${page.wireframeId}\`가 스펙에 없음`)
      continue
    }
    const elements: UIElement[] = []
    for (const elementId of wireframe.elementIds) {
      const el = elementById.get(elementId)
      if (!el) {
        broken.add(`화면 "${page.name}"의 와이어프레임이 참조하는 요소 \`${elementId}\`가 스펙에 없음`)
        continue
      }
      elements.push(el)
      for (const apiId of el.apiIds) if (apiById.has(apiId)) referencedApiIds.add(apiId)
      for (const dbId of el.dbTableIds) {
        const table = dbById.get(dbId)
        if (table) referencedTables.set(table.id, table)
      }
      // 요소 레벨의 끊어진 참조는 elementLine에서 수집(중복 push 방지를 위해 렌더 시 1회).
    }
    pageElements.set(page.id, elements)
  }

  const referencedApis = apis.filter((api) => referencedApiIds.has(api.id))
  const reuseApis = referencedApis.filter((api) => api.status !== "planned")
  const newApis = referencedApis.filter((api) => api.status === "planned")

  const lines: string[] = []
  lines.push(`# 구현 컨텍스트 — ${input.workspaceName}`)
  lines.push("")
  lines.push(`> Assembler 스펙에서 선택한 기능 ${features.length}개의 연결된 명세다.`)
  lines.push("> - [재사용] 항목은 이미 코드에 있다 — 새로 만들지 말고 그대로 사용할 것.")
  lines.push("> - [신규] 항목은 코드에 없다 — 아래 명세대로 구현할 것.")
  lines.push('> - 이 문서에 없는 API·테이블·화면을 지어내지 말 것. "연결 끊김" 항목은 구현 전에 스펙에서 확인할 것.')

  lines.push("", "## 요구사항 (Why)")
  if (requirements.size === 0) lines.push("- (연결된 요구사항 없음)")
  for (const req of requirements.values()) {
    lines.push(`### ${req.title}`)
    // 역할 빈 값은 조각 생략 — "역할: "로 끝나는 미완 라인을 만들지 않는다.
    const meta = [`상태: ${req.status}`, `우선순위: ${req.priority}`, req.role && `역할: ${req.role}`]
    lines.push(`- ${meta.filter(Boolean).join(" · ")}`)
    if (req.description) lines.push(req.description)
    if (req.acceptanceCriteria.length > 0) {
      lines.push("수용 기준:")
      for (const criteria of req.acceptanceCriteria) lines.push(`- [ ] ${criteria}`)
    }
  }

  lines.push("", "## 기능 명세 (What)")
  for (const feature of features) {
    lines.push(`### ${feature.name}`)
    if (feature.description) lines.push(feature.description)
    if (feature.detailFeatures.length > 0) {
      lines.push("세부 기능:")
      for (const detail of feature.detailFeatures) {
        lines.push(`- ${detail.title}${detail.description ? ` — ${detail.description}` : ""}`)
      }
    }
  }

  lines.push("", "## 유저 플로우 경로")
  lines.push(...flowSection(design.flows, new Set(pages.keys()), pageById))

  lines.push("", "## API — 재사용 (코드에 있음)")
  lines.push(...(reuseApis.length > 0 ? reuseApis.map(apiLine) : ["- (없음)"]))

  lines.push("", "## API — 신규 (코드에 없음 — 구현 필요)")
  lines.push(...(newApis.length > 0 ? newApis.map(apiLine) : ["- (없음)"]))

  lines.push("", "## DB 테이블 — 재사용 (코드에 있음)")
  if (referencedTables.size === 0) lines.push("- (없음)")
  for (const table of referencedTables.values()) {
    lines.push(`### ${table.name} (${sourceBadge(table.source)})`)
    if (table.description) lines.push(table.description)
    lines.push(`컬럼: ${columnSummary(table)}`)
  }

  // ASM-052 와이어 후퇴 — 요소가 하나도 없으면(새 계약의 기본) 와이어 표면을 약속하지 않는다.
  // 요소가 있으면(레거시 저장 데이터) 기존 섹션명·요소 매핑을 그대로 낸다. 빈 채움말 금지 — 거짓 표면 방지.
  const hasAnyElements = [...pages.values()].some((page) => (pageElements.get(page.id)?.length ?? 0) > 0)
  lines.push("", hasAnyElements ? "## 화면·와이어프레임" : "## 화면")
  if (pages.size === 0) lines.push("- (연결된 화면 없음)")
  for (const page of pages.values()) {
    lines.push(`### ${page.name}`)
    if (page.description) lines.push(page.description)
    const elements = pageElements.get(page.id)
    if (elements && elements.length > 0) for (const el of elements) lines.push(elementLine(el, apiById, dbById, broken))
  }

  if (broken.size > 0) {
    lines.push("", "## 연결 끊김 (구현 전 확인 필요)")
    for (const item of broken) lines.push(`- ${item}`)
  }

  return lines.join("\n")
}

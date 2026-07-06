import type { Api, ApiStatus, DbTable, Feature, HttpMethod, WorkspaceDesign } from "@/lib/types/assembler"
import type { DocTocEntry } from "./docProjection"

// 모델 → 기술 명세(독자=개발자) 각도의 읽기 투사. 저장하지 않고 렌더 시 계산한다(단일 출처 유지).
// 기능이 API·DB 연결의 1급 주인(product-definition F2) — 섹션 단위는 기능이다.

export type TechSpecApiRow = {
  id: string
  method: HttpMethod
  endpoint: string
  status: ApiStatus
  summary: string
}

export type TechSpecTableRef = {
  id: string
  name: string
  description: string
}

export type TechSpecFeatureHead = {
  id: string
  name: string
  description: string
}

export type TechSpecSection = {
  feature: TechSpecFeatureHead
  // 이 기능이 왜 존재하는가(의도) — 연결 요구사항.
  requirements: { id: string; title: string }[]
  pages: { id: string; name: string }[]
  apis: TechSpecApiRow[]
  dbTables: TechSpecTableRef[]
}

export type TechSpecProjection = {
  sections: TechSpecSection[]
  // 유효한 API·DB 연결이 하나도 없는 기능 — 조용히 숨기면 모델과 문서가 어긋나므로 말미 섹션으로 표시(projectDoc 관례).
  unlinkedFeatures: TechSpecFeatureHead[]
  toc: DocTocEntry[]
  isEmpty: boolean
}

export const TECH_UNLINKED_ANCHOR_ID = "techp-unlinked"
export const TECH_UNLINKED_SECTION_TITLE = "아직 API·DB에 연결되지 않은 기능"

export function techAnchorId(featureId: string): string {
  return `techp-feat-${featureId}`
}

// feature.dbTableIds는 레인 1이 병행 신설 중 — 타입에 아직 없어도 옵셔널로 읽는다(머지 후 자동 활성).
export function featureDbTableIds(feature: Feature): string[] {
  return (feature as Feature & { dbTableIds?: string[] }).dbTableIds ?? []
}

function toFeatureHead(f: Feature): TechSpecFeatureHead {
  return { id: f.id, name: f.name, description: f.description }
}

export function projectTechSpec(design: WorkspaceDesign, apis: Api[], dbTables: DbTable[]): TechSpecProjection {
  const reqById = new Map(design.requirements.map((r) => [r.id, r]))
  const pageById = new Map(design.pages.map((p) => [p.id, p]))
  const apiById = new Map(apis.map((a) => [a.id, a]))
  const tableById = new Map(dbTables.map((t) => [t.id, t]))

  const sections: TechSpecSection[] = []
  const unlinkedFeatures: TechSpecFeatureHead[] = []

  for (const feature of design.features) {
    const linkedApis = feature.apiIds
      .map((id) => apiById.get(id))
      .filter((a): a is Api => a !== undefined)
      .map((a) => ({ id: a.id, method: a.method, endpoint: a.endpoint, status: a.status, summary: a.summary }))

    const linkedTables = featureDbTableIds(feature)
      .map((id) => tableById.get(id))
      .filter((t): t is DbTable => t !== undefined)
      .map((t) => ({ id: t.id, name: t.name, description: t.description }))

    // 기술 명세의 주제는 코드 연결 — 유효한 API·DB가 전무하면 유령 연결로 승격하지 않고 정직 섹션으로.
    if (linkedApis.length === 0 && linkedTables.length === 0) {
      unlinkedFeatures.push(toFeatureHead(feature))
      continue
    }

    sections.push({
      feature: toFeatureHead(feature),
      requirements: feature.requirementIds
        .map((id) => reqById.get(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined)
        .map((r) => ({ id: r.id, title: r.title })),
      pages: feature.pageIds
        .map((id) => pageById.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => ({ id: p.id, name: p.name })),
      apis: linkedApis,
      dbTables: linkedTables,
    })
  }

  const toc: DocTocEntry[] = sections.map((sec) => ({
    anchorId: techAnchorId(sec.feature.id),
    title: sec.feature.name,
  }))
  if (unlinkedFeatures.length > 0) toc.push({ anchorId: TECH_UNLINKED_ANCHOR_ID, title: TECH_UNLINKED_SECTION_TITLE })

  return {
    sections,
    unlinkedFeatures,
    toc,
    isEmpty: design.features.length === 0,
  }
}

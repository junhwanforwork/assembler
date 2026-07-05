import type { DetailFeature, Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"

// 모델(WorkspaceDesign) → PRD 문서 각도의 읽기 투사. 저장하지 않고 렌더 시 계산한다(단일 출처 유지).

export type DocFeatureBlock = {
  id: string
  name: string
  description: string
  detailFeatures: DetailFeature[]
}

export type DocSection = {
  requirement: Requirement
  features: DocFeatureBlock[]
}

export type DocTocEntry = {
  anchorId: string
  title: string
}

export type DocProjection = {
  sections: DocSection[]
  // 유효한 요구사항 연결이 하나도 없는 기능(빈 배열·전부 dangling).
  // 조용히 숨기면 모델과 문서가 어긋나므로 말미 섹션으로 표시한다.
  unlinkedFeatures: DocFeatureBlock[]
  toc: DocTocEntry[]
  isEmpty: boolean
}

export const UNLINKED_ANCHOR_ID = "docp-unlinked"
export const UNLINKED_SECTION_TITLE = "연결되지 않은 기능"

export function docAnchorId(requirementId: string): string {
  return `docp-req-${requirementId}`
}

function toFeatureBlock(f: Feature): DocFeatureBlock {
  return { id: f.id, name: f.name, description: f.description, detailFeatures: f.detailFeatures }
}

export function projectDoc(design: WorkspaceDesign): DocProjection {
  const requirementIds = new Set(design.requirements.map((r) => r.id))

  const sections: DocSection[] = design.requirements.map((requirement) => ({
    requirement,
    features: design.features.filter((f) => f.requirementIds.includes(requirement.id)).map(toFeatureBlock),
  }))

  const unlinkedFeatures = design.features
    .filter((f) => !f.requirementIds.some((id) => requirementIds.has(id)))
    .map(toFeatureBlock)

  const toc: DocTocEntry[] = sections.map((sec) => ({
    anchorId: docAnchorId(sec.requirement.id),
    title: sec.requirement.title,
  }))
  if (unlinkedFeatures.length > 0) toc.push({ anchorId: UNLINKED_ANCHOR_ID, title: UNLINKED_SECTION_TITLE })

  return {
    sections,
    unlinkedFeatures,
    toc,
    isEmpty: sections.length === 0 && unlinkedFeatures.length === 0,
  }
}

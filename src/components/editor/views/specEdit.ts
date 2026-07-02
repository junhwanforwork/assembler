import type { DetailFeature, Requirement, RequirementStatus, WorkspaceDesign } from "@/lib/types/assembler"
import type { DesignPatch } from "@/lib/types/design"
import { nanoid } from "@/lib/utils"

// ── 편집 인터랙션(#30·#34·#37·#42) 패치 빌더 — 전부 순수(원본 불변). ──
// 항상 "최신 저장본"을 받아 스코프드 패치(바뀐 컬렉션만)를 만든다. null = 지금 스펙에 적용 불가
// (대상 소실·빈 입력) — 저장 없이 취소한다. 저장·409 재시도는 design-patch 헬퍼 몫.

export function createRequirement(title: string, id = `req-${nanoid()}`): Requirement {
  // #30 기본값 — status=draft·priority=medium·역할 빈 값. 미연결 허용(표시는 뷰가).
  return { id, title, description: "", status: "draft", priority: "medium", role: "", acceptanceCriteria: [] }
}

export function createDetailFeature(title: string, id = `detail-${nanoid()}`): DetailFeature {
  return { id, title, description: "" }
}

export function buildAddRequirementPatch(latest: WorkspaceDesign, requirement: Requirement): DesignPatch | null {
  // 409 재적용 시 같은 패치가 두 번 흘러도 이중 추가되지 않게 id로 막는다.
  if (latest.requirements.some((r) => r.id === requirement.id)) return null
  return { requirements: [...latest.requirements, requirement] }
}

export function buildAddAcceptanceCriterionPatch(
  latest: WorkspaceDesign,
  requirementId: string,
  text: string,
): DesignPatch | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!latest.requirements.some((r) => r.id === requirementId)) return null
  return {
    requirements: latest.requirements.map((r) =>
      r.id === requirementId ? { ...r, acceptanceCriteria: [...r.acceptanceCriteria, trimmed] } : r,
    ),
  }
}

export function buildAddDetailFeaturePatch(
  latest: WorkspaceDesign,
  featureId: string,
  detail: DetailFeature,
): DesignPatch | null {
  if (!latest.features.some((f) => f.id === featureId)) return null
  return {
    features: latest.features.map((f) =>
      f.id === featureId ? { ...f, detailFeatures: [...f.detailFeatures, detail] } : f,
    ),
  }
}

export type BulkRequirementChange = { status?: RequirementStatus; role?: string }

export function buildBulkRequirementPatch(
  latest: WorkspaceDesign,
  ids: string[],
  change: BulkRequirementChange,
): DesignPatch | null {
  const role = change.role?.trim()
  if (!change.status && !role) return null
  const targets = new Set(ids)
  // 사라진 id는 건너뛴다 — 남은 대상이 하나도 없으면 무의미 저장이라 취소.
  if (!latest.requirements.some((r) => targets.has(r.id))) return null
  return {
    requirements: latest.requirements.map((r) =>
      targets.has(r.id) ? { ...r, ...(change.status ? { status: change.status } : {}), ...(role ? { role } : {}) } : r,
    ),
  }
}

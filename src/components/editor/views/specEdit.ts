import type {
  ChangeStatus,
  DetailFeature,
  ImplStatus,
  Requirement,
  RequirementStatus,
  ReviewRole,
  ReviewState,
  WorkspaceDesign,
} from "@/lib/types/assembler"
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

// ── 직접 수정(인라인 편집) 빌더 ──
// 제목/이름은 필수(trim 빈값→null=취소), 설명은 빈 값 허용(지우기). 값이 그대로면 null=무변경 스킵
// (불필요 PATCH 0). 대상 소실도 null. 설명은 trim 후 비교·저장(앞뒤 공백 정규화).

export type RequirementEdit = { title?: string; description?: string }

export function buildUpdateRequirementPatch(
  latest: WorkspaceDesign,
  id: string,
  edit: RequirementEdit,
): DesignPatch | null {
  const target = latest.requirements.find((r) => r.id === id)
  if (!target) return null
  const next = { ...target }
  let changed = false
  if (edit.title !== undefined) {
    const title = edit.title.trim()
    if (!title) return null
    if (title !== target.title) {
      next.title = title
      changed = true
    }
  }
  if (edit.description !== undefined) {
    const description = edit.description.trim()
    if (description !== target.description) {
      next.description = description
      changed = true
    }
  }
  if (!changed) return null
  return { requirements: latest.requirements.map((r) => (r.id === id ? next : r)) }
}

export type FeatureEdit = { name?: string; description?: string }

export function buildUpdateFeaturePatch(latest: WorkspaceDesign, id: string, edit: FeatureEdit): DesignPatch | null {
  const target = latest.features.find((f) => f.id === id)
  if (!target) return null
  const next = { ...target }
  let changed = false
  if (edit.name !== undefined) {
    const name = edit.name.trim()
    if (!name) return null
    if (name !== target.name) {
      next.name = name
      changed = true
    }
  }
  if (edit.description !== undefined) {
    const description = edit.description.trim()
    if (description !== target.description) {
      next.description = description
      changed = true
    }
  }
  if (!changed) return null
  return { features: latest.features.map((f) => (f.id === id ? next : f)) }
}

export type DetailFeatureEdit = { title?: string; description?: string }

export function buildUpdateDetailFeaturePatch(
  latest: WorkspaceDesign,
  featureId: string,
  detailId: string,
  edit: DetailFeatureEdit,
): DesignPatch | null {
  const feature = latest.features.find((f) => f.id === featureId)
  if (!feature) return null
  const detail = feature.detailFeatures.find((d) => d.id === detailId)
  if (!detail) return null
  const nextDetail = { ...detail }
  let changed = false
  if (edit.title !== undefined) {
    const title = edit.title.trim()
    if (!title) return null
    if (title !== detail.title) {
      nextDetail.title = title
      changed = true
    }
  }
  if (edit.description !== undefined) {
    const description = edit.description.trim()
    if (description !== detail.description) {
      nextDetail.description = description
      changed = true
    }
  }
  if (!changed) return null
  return {
    features: latest.features.map((f) =>
      f.id === featureId
        ? { ...f, detailFeatures: f.detailFeatures.map((d) => (d.id === detailId ? nextDetail : d)) }
        : f,
    ),
  }
}

// ── 상태/리뷰 설정 빌더 — Storyboard(SW1) 필드. 값이 같으면 null=무변경 스킵. ──

export function buildSetImplStatusPatch(
  latest: WorkspaceDesign,
  featureId: string,
  status: ImplStatus,
): DesignPatch | null {
  const target = latest.features.find((f) => f.id === featureId)
  if (!target) return null
  if (target.implStatus === status) return null
  return { features: latest.features.map((f) => (f.id === featureId ? { ...f, implStatus: status } : f)) }
}

export function buildSetChangeStatusPatch(
  latest: WorkspaceDesign,
  featureId: string,
  status: ChangeStatus,
): DesignPatch | null {
  const target = latest.features.find((f) => f.id === featureId)
  if (!target) return null
  if (target.changeStatus === status) return null
  return { features: latest.features.map((f) => (f.id === featureId ? { ...f, changeStatus: status } : f)) }
}

export function buildSetReviewPatch(
  latest: WorkspaceDesign,
  featureId: string,
  role: ReviewRole,
  state: ReviewState,
): DesignPatch | null {
  const target = latest.features.find((f) => f.id === featureId)
  if (!target) return null
  const current = target.reviews?.[role]
  // "미확인" = 해당 역할 키 삭제 → ReviewBadges가 다시 "—"로 표시. 이미 없으면 무변경.
  if (state === "not_checked") {
    if (current === undefined) return null
    const nextReviews = { ...target.reviews }
    delete nextReviews[role]
    return { features: latest.features.map((f) => (f.id === featureId ? { ...f, reviews: nextReviews } : f)) }
  }
  if (current === state) return null
  return {
    features: latest.features.map((f) =>
      f.id === featureId ? { ...f, reviews: { ...f.reviews, [role]: state } } : f,
    ),
  }
}

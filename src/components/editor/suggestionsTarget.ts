import type { SuggestionTargetType, WorkspaceDesign } from "@/lib/types/assembler"

// suggestions 타깃 → 인스펙터 선택 경로 해석 (ASM-023).
// store의 명세 선택은 요구사항→기능 경로로만 비추므로, 그 경로가 성립하는 타깃만 점프 가능.
// page·flow·element 는 대응 선택이 store에 없어 비링크(이름 텍스트만)로 다룬다.

export type SuggestionJump =
  | { kind: "requirement"; reqId: string }
  | { kind: "feature"; reqId: string; featureId: string }

export function resolveSuggestionJump(
  design: WorkspaceDesign,
  targetType: SuggestionTargetType | null,
  targetId: string | null
): SuggestionJump | null {
  if (!targetType || !targetId) return null

  if (targetType === "requirement") {
    return design.requirements.some((r) => r.id === targetId) ? { kind: "requirement", reqId: targetId } : null
  }

  if (targetType === "feature") {
    const feature = design.features.find((f) => f.id === targetId)
    if (!feature) return null
    // 인스펙터는 선택된 요구사항 하위에서만 기능을 찾는다 — 현존하는 부모 요구사항이 있어야 경로가 열린다.
    const parentReqId = feature.requirementIds.find((rid) => design.requirements.some((r) => r.id === rid))
    return parentReqId ? { kind: "feature", reqId: parentReqId, featureId: feature.id } : null
  }

  return null
}

export function suggestionTargetName(
  design: WorkspaceDesign,
  targetType: SuggestionTargetType | null,
  targetId: string | null
): string | null {
  if (!targetType || !targetId) return null
  switch (targetType) {
    case "requirement":
      return design.requirements.find((r) => r.id === targetId)?.title ?? null
    case "feature":
      return design.features.find((f) => f.id === targetId)?.name ?? null
    case "page":
      return design.pages.find((p) => p.id === targetId)?.name ?? null
    case "flow":
      return design.flows.find((f) => f.id === targetId)?.name ?? null
    case "element":
      return design.elements.find((e) => e.id === targetId)?.label ?? null
  }
}

import type { WorkspaceDesign } from "@/lib/types/assembler"
import { EMPTY_SPEC_FILTERS, useEditorStore } from "@/lib/stores/useEditorStore"
import { buildFeatureNamesByReq, filterRequirements } from "./views/specFilter"
import type { SuggestionJump } from "./suggestionsTarget"

// #39 점프 가드의 단일 출처(ASM-038) — 타깃 요구사항이 명세 뷰 필터에 걸러져 있으면
// 필터를 풀고 이동한다(조용한 오점프 방지). 인스펙터·도크는 어느 뷰에서든 떠 있으므로
// 목적지(명세 뷰)로도 데려간다. SuggestionsCard·ImpactSection·FeaturePanel이 공유한다.

export function useSpecJump(design: WorkspaceDesign): (target: SuggestionJump) => void {
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const specFilters = useEditorStore((st) => st.specFilters)
  const setSpecFilters = useEditorStore((st) => st.setSpecFilters)

  return (target: SuggestionJump) => {
    const visible = filterRequirements(design.requirements, buildFeatureNamesByReq(design.features), specFilters)
    if (!visible.some((r) => r.id === target.reqId)) setSpecFilters(EMPTY_SPEC_FILTERS)
    selectSpecReq(target.reqId)
    if (target.kind === "feature") selectSpecFeature(target.featureId)
    setActiveView("spec")
  }
}

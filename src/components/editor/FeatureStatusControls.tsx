"use client"

import type { Feature, WorkspaceDesign } from "@/lib/types/assembler"

// 기능 상태/리뷰 설정 — 구현 여부·변경 여부(Select ×2) + 역할별 확인(기획/디자인/개발, 3상태 Segmented).
// 저장은 buildSetImplStatusPatch·buildSetChangeStatusPatch·buildSetReviewPatch(specEdit.ts) + patchDesignScoped.
//
// ⚠ 레인 0 스텁(계약 동결) — 프롭 시그니처만 확정하고, 실제 컨트롤 구현은 레인 B(ASM-085) 몫.
//    레인 B는 이 파일을 소유해 전량 구현한다(FeaturePanel 마운트는 레인 0이 이미 심음 → 충돌 0).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 스텁: 프롭 계약만 동결(레인 B가 구현하며 소비)
export function FeatureStatusControls(props: {
  feature: Feature
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  return null
}

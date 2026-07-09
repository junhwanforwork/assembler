"use client"

import { useEffect, useRef } from "react"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { OverlayPanel } from "@/components/ui/OverlayPanel"
import { SpecInspector } from "./InspectorSpecPanels"
import { deepestSelectedId, shouldAutoOpenDetail } from "./specAutoOpen"

// 명세 상세 플로팅 창(SW2) — 도킹 우패널(RightPanel)의 상세 본문(SpecInspector)을 떠 있는 창으로 재사용한다.
// DocOverlay 패턴 복제: 상시 마운트 + store 플래그(detailOverlayOpen) 구동. 조건부 마운트는 닫힘 애니메이션
// 미도달 경로라 OverlayPanel이 open=false에서 스스로 null을 반환(퇴장 후 언마운트)한다.
// 선택 상태는 SpecInspector가 store(specSelected*)에서 자급 — 우패널과 같은 선택을 그대로 비춘다(추가 표면).
// 백드롭·Esc·포커스 트랩·reduced-motion은 OverlayPanel 몫.
export function DetailOverlay({
  design,
  workspaceId,
  onDesignChange,
}: {
  design: WorkspaceDesign
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const open = useEditorStore((st) => st.detailOverlayOpen)
  const openDetailOverlay = useEditorStore((st) => st.openDetailOverlay)
  const closeDetailOverlay = useEditorStore((st) => st.closeDetailOverlay)
  const specSelectedReqId = useEditorStore((st) => st.specSelectedReqId)
  const specSelectedFeatureId = useEditorStore((st) => st.specSelectedFeatureId)
  const specSelectedDetailId = useEditorStore((st) => st.specSelectedDetailId)
  const inspected = useEditorStore((st) => st.inspected)

  // 선택 시 자동 오픈(기본 꺼짐) — 창업자 지시. store 액션엔 부수효과를 넣지 않는다(비클릭 syncSpecSelection 오작동 방지).
  // 최심 선택 id를 ref로 보관해 "사용자 클릭(inspected==='spec')으로 새 선택(non-null)"으로 바뀐 전이에서만 연다.
  // 초기 마운트: ref가 현재값으로 시작(useRef 초기값) → 첫 실행은 prev===next라 안 열린다. null 전환·비클릭 보정도 안 열린다.
  // (기본 activeView='spec'이라 SpecView가 로드 때 requirements[0]을 syncSpecSelection으로 보정하지만 inspected는 null → 안 열림.)
  const activeId = deepestSelectedId({
    reqId: specSelectedReqId,
    featureId: specSelectedFeatureId,
    detailId: specSelectedDetailId,
  })
  const prevActiveIdRef = useRef<string | null>(activeId)
  useEffect(() => {
    if (shouldAutoOpenDetail(prevActiveIdRef.current, activeId, inspected === "spec")) openDetailOverlay()
    prevActiveIdRef.current = activeId
  }, [activeId, inspected, openDetailOverlay])

  return (
    <OverlayPanel
      open={open}
      onClose={closeDetailOverlay}
      variant="window"
      title="상세"
      titleId="detail-overlay-title"
      closeLabel="상세 닫기"
    >
      <SpecInspector design={design} workspaceId={workspaceId} onDesignChange={onDesignChange} />
    </OverlayPanel>
  )
}

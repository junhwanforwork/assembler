"use client"

import type { WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { OverlayPanel } from "@/components/ui/OverlayPanel"
import { SpecInspector } from "./InspectorSpecPanels"

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
  const closeDetailOverlay = useEditorStore((st) => st.closeDetailOverlay)

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

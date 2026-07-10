"use client"

import { useEffect, useRef } from "react"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { OverlayPanel } from "@/components/ui/OverlayPanel"
import { SpecInspector } from "./InspectorSpecPanels"
import { TableInspector } from "./TableInspector"
import { shouldAutoOpenDetail } from "./specAutoOpen"

// 상세 플로팅 창(SW2·ASM-080) — 상세 표면을 이 창 하나로 통일한다. 도킹 우패널(RightPanel)은 삭제됐고,
// 명세 상세(SpecInspector)와 테이블 상세(TableInspector)를 마지막 선택(inspected)에 따라 이 창이 렌더한다.
// DocOverlay 패턴 복제: 상시 마운트 + store 플래그(detailOverlayOpen) 구동. 조건부 마운트는 닫힘 애니메이션
// 미도달 경로라 OverlayPanel이 open=false에서 스스로 null을 반환(퇴장 후 언마운트)한다.
// 선택 상태(specSelected*·selectedTable)는 store에서 자급 — 각 뷰의 선택을 그대로 비춘다.
// 백드롭·Esc·포커스 트랩·reduced-motion은 OverlayPanel 몫.
export function DetailOverlay({
  design,
  workspaceId,
  onDesignChange,
  apis,
  dbTables,
}: {
  design: WorkspaceDesign
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
  apis: Api[]
  dbTables: DbTable[]
}) {
  const open = useEditorStore((st) => st.detailOverlayOpen)
  const openDetailOverlay = useEditorStore((st) => st.openDetailOverlay)
  const closeDetailOverlay = useEditorStore((st) => st.closeDetailOverlay)
  const specSelectClickSeq = useEditorStore((st) => st.specSelectClickSeq)
  const inspected = useEditorStore((st) => st.inspected)
  const selectedTable = useEditorStore((st) => st.selectedTable)

  // 사라진 id(테이블 싱크 삭제 등)는 여기서 걸러진다 — 못 찾으면 spec 인스펙터로 자연 폴백.
  const table = selectedTable ? dbTables.find((t) => t.id === selectedTable) : undefined

  // 선택 시 자동 오픈(기본 꺼짐) — 창업자 지시. store 클릭 카운터(specSelectClickSeq)가 오른 전이에서만 연다.
  // 카운터를 ref로 보관: 초기 마운트는 prev===next라 안 열린다. 비클릭 보정(syncSpecSelection)·null 해제는 카운터를
  // 안 올리므로 안 열린다. 닫은 뒤 필터 보정으로 선택 id가 바뀌어도 카운터는 그대로라 스스로 재오픈하지 않는다.
  // 같은 항목 재클릭은 카운터가 올라 재오픈된다.
  const prevSeqRef = useRef<number>(specSelectClickSeq)
  useEffect(() => {
    if (shouldAutoOpenDetail(prevSeqRef.current, specSelectClickSeq)) openDetailOverlay()
    prevSeqRef.current = specSelectClickSeq
  }, [specSelectClickSeq, openDetailOverlay])

  // 비모달(modal=false): 클로드 플랜 창처럼 "열어두고 뒤(프롬프트·캔버스)도 계속 조작"하는 참조 창.
  // 백드롭이 화면을 막지 않고 포커스 트랩·스크롤 잠금도 없다(창업자 #7 지시). Esc·닫기 버튼은 유지.
  return (
    <OverlayPanel
      open={open}
      onClose={closeDetailOverlay}
      variant="window"
      modal={false}
      title="상세"
      titleId="detail-overlay-title"
      closeLabel="상세 닫기"
    >
      {inspected === "table" && table ? (
        <TableInspector table={table} apis={apis} design={design} workspaceId={workspaceId} />
      ) : (
        <SpecInspector design={design} workspaceId={workspaceId} onDesignChange={onDesignChange} />
      )}
    </OverlayPanel>
  )
}

"use client"

import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { OverlayPanel } from "@/components/ui/OverlayPanel"
import { DataDictionaryDoc, DocKindSegmented, PrdDoc, TechSpecDoc } from "./views/DocView"
import s from "./editor.module.css"

// 문서 오버레이 창(ASM-065) — 클로드 데스크톱식 임시 창. 다른 뷰에서 작업하며 문서를 띄워 본다.
// 중앙 문서 뷰의 추가 경로(대체 아님) — 본문 3종·종류 선택(docKind) 전부 중앙 뷰와 공유.
// 진입은 TopBar "문서 띄우기"(store 구동) — 마운트는 문서 데이터를 가진 CenterView가 상시 유지
// (조건부 마운트는 닫힘 애니메이션 미도달 경로 — ActivitySlideover QA 정정과 같은 이유).
// 백드롭·Esc·포커스 트랩·reduced-motion은 OverlayPanel 몫.
export function DocOverlay({
  design,
  apis,
  dbTables,
  workspaceId,
}: {
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  workspaceId: string
}) {
  const open = useEditorStore((st) => st.docOverlayOpen)
  const closeDocOverlay = useEditorStore((st) => st.closeDocOverlay)
  const docKind = useEditorStore((st) => st.docKind)

  return (
    <OverlayPanel
      open={open}
      onClose={closeDocOverlay}
      variant="window"
      title="문서"
      titleId="doc-overlay-title"
      closeLabel="문서 닫기"
    >
      <div className={s.docOverlayBody}>
        <DocKindSegmented />
        {docKind === "prd" && <PrdDoc design={design} />}
        {docKind === "tech" && (
          <TechSpecDoc design={design} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />
        )}
        {docKind === "data" && <DataDictionaryDoc design={design} dbTables={dbTables} workspaceId={workspaceId} />}
      </div>
    </OverlayPanel>
  )
}

"use client"

import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { DocOverlay } from "./DocOverlay"
import { PolicyView } from "./PolicyView"
import { DocView } from "./views/DocView"
import { ProductRequirementView } from "./views/ProductRequirementView"
import { SpecView } from "./views/SpecView"
import { FlowView } from "./views/FlowView"
import { DataView } from "./views/DataView"
import s from "./editor.module.css"

// Layer 2 CenterView — activeView에 맞는 뷰를 꽂는 본문 슬롯. 뷰 헤더(viewHead)는 각 뷰가 소유한다.
export function CenterView({
  design,
  apis,
  dbTables,
  workspaceId,
  onDesignChange,
}: {
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const activeView = useEditorStore((st) => st.activeView)

  return (
    <main className={s.center}>
      {activeView === "doc" && <DocView design={design} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />}
      {activeView === "preq" && <ProductRequirementView design={design} />}
      {activeView === "spec" && <SpecView design={design} workspaceId={workspaceId} onDesignChange={onDesignChange} />}
      {activeView === "flow" && <FlowView design={design} />}
      {activeView === "data" && <DataView design={design} apis={apis} dbTables={dbTables} />}
      {activeView === "policy" && <PolicyView apis={apis} dbTables={dbTables} />}
      {/* 문서 오버레이(ASM-065) — activeView와 무관하게 상시 마운트 + store open 구동.
          진입 버튼은 TopBar지만 문서 데이터(design·apis·dbTables)는 여기가 갖고 있다. */}
      <DocOverlay design={design} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />
    </main>
  )
}

"use client"

import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { DocView } from "./views/DocView"
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
      {activeView === "doc" && <DocView design={design} />}
      {activeView === "spec" && <SpecView design={design} workspaceId={workspaceId} onDesignChange={onDesignChange} />}
      {activeView === "flow" && <FlowView design={design} />}
      {activeView === "data" && <DataView design={design} apis={apis} dbTables={dbTables} />}
    </main>
  )
}

"use client"

import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { EditorTopBar } from "./EditorTopBar"
import { EditorTree } from "./EditorTree"
import { EditorInspector } from "./EditorInspector"
import { DocView } from "./views/DocView"
import { SpecView } from "./views/SpecView"
import { FlowView } from "./views/FlowView"
import { WireframeView } from "./views/WireframeView"
import { DataView } from "./views/DataView"
import s from "./editor.module.css"

// 에디터 셸 — 좌 264 / 중앙 1fr / 우 320 그리드. 데이터·store 주입.
export function EditorClient({
  workspace,
  design,
  apis,
  dbTables,
}: {
  workspace: Workspace
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
}) {
  const activeView = useEditorStore((st) => st.activeView)
  const leftCollapsed = useEditorStore((st) => st.leftCollapsed)
  const rightCollapsed = useEditorStore((st) => st.rightCollapsed)

  return (
    <div className={s.shell}>
      <EditorTopBar workspace={workspace} />
      <div className={clsx(s.body, leftCollapsed && s.lc, rightCollapsed && s.rc)}>
        <EditorTree />

        <main className={s.center}>
          {activeView === "doc" && <DocView design={design} />}
          {activeView === "spec" && <SpecView design={design} />}
          {activeView === "flow" && <FlowView design={design} />}
          {activeView === "wire" && <WireframeView design={design} />}
          {activeView === "data" && <DataView design={design} apis={apis} dbTables={dbTables} />}
        </main>

        <EditorInspector workspace={workspace} design={design} apis={apis} dbTables={dbTables} />
      </div>
    </div>
  )
}

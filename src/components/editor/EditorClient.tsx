"use client"

import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { TopBar } from "./TopBar"
import { LeftRail } from "./LeftRail"
import { CenterView } from "./CenterView"
import { RightPanel } from "./RightPanel"
import { ChatDock } from "./dock/ChatDock"
import s from "./editor.module.css"

// 에디터 셸 오케스트레이터 — 좌 264 / 중앙 1fr / 우 320 그리드 + 하단 챗 도크(ASM-018).
export function EditorClient({
  workspace,
  design,
  apis,
  dbTables,
  onDesignChange,
}: {
  workspace: Workspace
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const leftCollapsed = useEditorStore((st) => st.leftCollapsed)
  const rightCollapsed = useEditorStore((st) => st.rightCollapsed)

  return (
    <div className={s.shell}>
      <TopBar workspace={workspace} />
      <div className={clsx(s.body, leftCollapsed && s.lc, rightCollapsed && s.rc)}>
        <LeftRail design={design} apis={apis} dbTables={dbTables} />
        <CenterView
          design={design}
          apis={apis}
          dbTables={dbTables}
          workspaceId={workspace.id}
          onDesignChange={onDesignChange}
        />
        <RightPanel
          workspace={workspace}
          design={design}
          apis={apis}
          dbTables={dbTables}
          onDesignChange={onDesignChange}
        />
      </div>
      <ChatDock workspaceId={workspace.id} design={design} onDesignChange={onDesignChange} />
    </div>
  )
}

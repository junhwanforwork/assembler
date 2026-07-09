"use client"

import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { TopBar } from "./TopBar"
import { LeftRail } from "./LeftRail"
import { CenterView } from "./CenterView"
import { RightPanel } from "./RightPanel"
import { DetailOverlay } from "./DetailOverlay"
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
      {/* 상세 플로팅 창(SW2) — 도킹 우패널(RightPanel)의 상세 본문을 떠 있는 창으로도 연다(추가 표면).
          CenterView(레인 2 소유)의 DocOverlay와 겹치지 않게 셸 오케스트레이터에서 상시 마운트(store 구동). */}
      <DetailOverlay design={design} workspaceId={workspace.id} onDesignChange={onDesignChange} />
    </div>
  )
}

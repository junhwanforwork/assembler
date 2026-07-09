"use client"

import { useEffect, useState } from "react"
import { clsx } from "clsx"
import type { CSSProperties } from "react"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { PROMPT_DOCK_MAX, PROMPT_DOCK_MIN, useResizable } from "@/hooks/useResizable"
import { TopBar } from "./TopBar"
import { LeftRail } from "./LeftRail"
import { CenterView } from "./CenterView"
import { RightPanel } from "./RightPanel"
import { DetailOverlay } from "./DetailOverlay"
import { PromptDock } from "./PromptDock"
import { ChatIcon } from "./icons"
import s from "./editor.module.css"

// 에디터 셸 오케스트레이터 — 프롬프트 좌측 도킹(ASM-076) / 설계 레일 264 / 중앙 1fr / 우패널(기본 숨김).
// 하단 챗 도크(ChatDock)는 프롬프트가 좌측 패널로 옮겨오며 마운트 제거(컴포넌트·로직은 재사용처로 보존).
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
  const promptDockWidth = useEditorStore((st) => st.promptDockWidth)
  const setPromptDockWidth = useEditorStore((st) => st.setPromptDockWidth)

  // 반응형·수동 접힘(간단한 토글 1개) — store는 additive만(계약 동결) 유지하려 로컬 state로 둔다.
  const [promptCollapsed, setPromptCollapsed] = useState(false)

  // 좁은 뷰포트에서는 프롬프트 패널을 접어 중앙 뷰에 자리를 준다(반응형). 경계 교차 때만 반영해
  // 사용자의 수동 토글을 매 리사이즈마다 뒤엎지 않는다. 재오픈은 플로팅 버튼으로 언제든 가능.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)")
    const apply = () => setPromptCollapsed(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // 폭 상태·드래그 커밋은 여기서 소유해 그리드 열 변수(--prompt-w)를 라이브 구동하고,
  // 그립 배선(handleProps)만 PromptDock에 내려준다.
  const { width, handleProps } = useResizable({
    initialWidth: promptDockWidth,
    min: PROMPT_DOCK_MIN,
    max: PROMPT_DOCK_MAX,
    onCommit: setPromptDockWidth,
  })

  const bodyStyle = { "--prompt-w": `${width}px` } as CSSProperties

  return (
    <div className={s.shell}>
      <TopBar workspace={workspace} />
      <div
        className={clsx(
          s.body,
          leftCollapsed && s.lc,
          rightCollapsed && s.rc,
          promptCollapsed && s.pc,
        )}
        style={bodyStyle}
      >
        {/* 항상 마운트 — 접힘은 그리드 열 폭 0(.pc)으로만 숨긴다(챗·입력 상태 보존, 그리드 트랙 정합 유지). */}
        <PromptDock
          workspaceId={workspace.id}
          design={design}
          onDesignChange={onDesignChange}
          resizeHandleProps={handleProps}
          onCollapse={() => setPromptCollapsed(true)}
        />
        <LeftRail design={design} />
        <CenterView
          design={design}
          apis={apis}
          dbTables={dbTables}
          workspaceId={workspace.id}
          onDesignChange={onDesignChange}
        />
        <RightPanel workspace={workspace} design={design} apis={apis} dbTables={dbTables} />
      </div>
      {/* 접힌 프롬프트 다시 열기 — 세로 패널을 치웠을 때 유일한 재진입 어포던스. */}
      {promptCollapsed && (
        <button
          type="button"
          className={s.promptReopen}
          aria-label="프롬프트 패널 열기"
          onClick={() => setPromptCollapsed(false)}
        >
          <ChatIcon />
        </button>
      )}
      {/* 상세 플로팅 창(SW2) — 도킹 우패널(RightPanel)의 상세 본문을 떠 있는 창으로도 연다(추가 표면).
          CenterView(레인 2 소유)의 DocOverlay와 겹치지 않게 셸 오케스트레이터에서 상시 마운트(store 구동). */}
      <DetailOverlay design={design} workspaceId={workspace.id} onDesignChange={onDesignChange} />
    </div>
  )
}

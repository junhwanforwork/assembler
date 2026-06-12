"use client"

import { type FC, useEffect, useState } from "react"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useBuilderStore } from "@/lib/store/builder"
import { useBuilderAutosave } from "@/hooks/useBuilderAutosave"
import { loadProject } from "@/lib/builder/api"
import { BuilderHeader } from "@/components/builder/BuilderHeader"
import { ScreenEditor } from "@/components/builder/screen/ScreenEditor"
import { Palette } from "@/components/builder/palette/Palette"
import { Inspector } from "@/components/builder/inspector/Inspector"
import { FlowCanvas } from "@/components/builder/flow/FlowCanvas"

type LoadState = "loading" | "ready" | "error"

// 빌더 화면 오케스트레이터: 프로젝트를 불러와 스토어에 적재하고,
// 헤더 + 본문(화면 에디터 / 플로우 뷰)을 조립한다. autosave를 여기서 구동한다.
export const BuilderShell: FC<{ projectId: string }> = ({ projectId }) => {
  const [state, setState] = useState<LoadState>("loading")
  const load = useBuilderStore((s) => s.load)
  const view = useBuilderStore((s) => s.view)
  const saveStatus = useBuilderAutosave()

  useEffect(() => {
    let cancelled = false
    loadProject(projectId)
      .then((project) => {
        if (cancelled) return
        load(project)
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => {
      cancelled = true
    }
  }, [projectId, load])

  if (state === "loading") {
    return <CenterNotice text="불러오는 중이에요" />
  }
  if (state === "error") {
    return <CenterNotice text="프로젝트를 찾을 수 없어요. 목록에서 다시 열어 주세요." />
  }

  return (
    <div style={SHELL_STYLE}>
      <BuilderHeader saveStatus={saveStatus} />
      {view === "screen" ? (
        <div style={BODY_STYLE}>
          <ScreenEditor palette={<div style={LEFT_PANEL_STYLE}><Palette /></div>} />
          <div style={RIGHT_PANEL_STYLE}>
            <Inspector />
          </div>
        </div>
      ) : (
        <div style={BODY_STYLE}>
          <FlowCanvas />
        </div>
      )}
    </div>
  )
}

const CenterNotice: FC<{ text: string }> = ({ text }) => (
  <div style={{ ...SHELL_STYLE, alignItems: "center", justifyContent: "center" }}>
    <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_MUTED }}>{text}</p>
  </div>
)

const SHELL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: COLOR.BG_BASE,
}

const BODY_STYLE: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
}

const LEFT_PANEL_STYLE: React.CSSProperties = {
  width: "232px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["4"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
}

const RIGHT_PANEL_STYLE: React.CSSProperties = {
  width: "300px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["4"],
  borderLeft: `1px solid ${COLOR.BORDER_DEFAULT}`,
}

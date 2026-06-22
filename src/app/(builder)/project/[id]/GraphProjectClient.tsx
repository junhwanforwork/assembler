"use client"

import { type FC, useEffect, useState } from "react"
import { GraphShell } from "@/components/builder/graph/GraphShell"
import { loadProjectGraph } from "@/lib/graph/api"
import { COLOR, TYPOGRAPHY } from "@/lib/design-tokens"
import type { ProjectGraph } from "@/lib/types/assembler"

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; graph: ProjectGraph }

// 실 프로젝트 로더 — document(jsonb)를 ProjectGraph로 보정해 GraphShell에 주입한다.
// 옛 BuilderShell(ProjectDocument)을 대체(ASS-092). 빈/레거시 document는 빈 그래프 → 히어로.
export const GraphProjectClient: FC<{ projectId: string }> = ({ projectId }) => {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    loadProjectGraph(projectId)
      .then(({ graph }) => {
        if (!cancelled) setState({ status: "ready", graph })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (state.status === "loading") return <CenterNotice text="불러오는 중이에요" />
  if (state.status === "error") {
    return <CenterNotice text="프로젝트를 찾을 수 없어요. 목록에서 다시 열어 주세요." />
  }
  return <GraphShell projectId={projectId} initialGraph={state.graph} />
}

const CenterNotice: FC<{ text: string }> = ({ text }) => (
  <div style={NOTICE_STYLE}>
    <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_MUTED }}>{text}</p>
  </div>
)

const NOTICE_STYLE: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: COLOR.BG_BASE,
}

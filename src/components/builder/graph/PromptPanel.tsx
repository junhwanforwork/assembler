"use client"

import { type FC, useState } from "react"
import { Button, TextArea } from "@/components/ui"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, SHADOW, LAYOUT } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { streamGraph, saveProjectGraph } from "@/lib/graph/api"
import { useGenerationProgress } from "@/lib/builder/useGenerationProgress"
import type { ProjectGraph } from "@/lib/types/assembler"
import type { LayerName } from "@/lib/graph/stream-protocol"

// AI 대화 도크(ASS-093) — 자연어 → ProjectGraph 생성 → 현재 프로젝트에 적재·영속.
// 측면 플로팅 패널. 좌·우 배치는 GraphShell이 렌더 순서로 결정. 빈 그래프에서도 같은 도크로 시작한다(ASS-207).
type Line = { role: "ai" | "me"; text: string }

const GREETING: Line = { role: "ai", text: "안녕하세요! 무엇을 만들까요? 화면이나 기능을 설명해 주세요." }

export const PromptPanel: FC = () => {
  const [lines, setLines] = useState<Line[]>([GREETING])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [layer, setLayer] = useState<LayerName | null>(null)
  const progress = useGenerationProgress(busy, layer)

  // 자연어 → 스트리밍 생성(ASS-204). 레이어 도착마다 누적 스냅샷을 머지(빈 그래프면 캔버스가 점진 채워짐),
  // done 에서 1회 저장. 첫 레이어부터 GraphShell이 chrome을 채운다.
  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setLayer(null)
    setLines((prev) => [...prev, { role: "me", text }])
    setDraft("")
    const store = useGraphStore.getState()
    const { projectId, mergeLayer, endStream, load } = store
    // 생성 직전 그래프 — 미완료 종료 시 부분 그래프를 이 상태로 되돌린다(절반짜리 빌더·우발 영속 방지).
    const priorGraph = store.graph
    let done = false
    try {
      let finalGraph: ProjectGraph | null = null
      for await (const ev of streamGraph(text)) {
        if (ev.type === "error") throw new Error(ev.message)
        mergeLayer(ev.graph)
        finalGraph = ev.graph
        if (ev.type === "layer") setLayer(ev.layer)
        if (ev.type === "done") done = true
      }
      endStream()
      // done 없이 끊긴 스트림은 부분 그래프 — 폐기하고 오류로 처리.
      if (!done) throw new Error("생성이 중단됐어요. 다시 시도해 주세요.")
      // preview는 픽스처용 — 저장 스킵. 실 프로젝트만 영속(완료 후 1회).
      if (finalGraph && projectId && projectId !== "preview") {
        await saveProjectGraph(projectId, text, finalGraph)
      }
    } catch (error) {
      endStream()
      // 미완료(done 전 실패) — 적재된 부분 레이어를 생성 전 그래프로 롤백.
      if (!done && priorGraph) load(projectId ?? "preview", priorGraph)
      const message =
        error instanceof Error ? error.message : "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."
      setLines((prev) => [...prev, { role: "ai", text: message }])
    } finally {
      setBusy(false)
      setLayer(null)
    }
  }

  return (
    <aside style={DOCK_PANEL_STYLE} aria-label="AI 대화">
      <div style={LOG_STYLE}>
        {lines.map((line, i) => (
          <div key={i} style={bubbleStyle(line.role)}>
            {line.text}
          </div>
        ))}
        {/* 생성 중 단계 피드백(ASS-200) — 없으면 "동작 없음"처럼 느껴진다. */}
        {busy ? (
          <div style={{ ...bubbleStyle("ai"), color: COLOR.TEXT_SECONDARY }}>{progress}</div>
        ) : null}
      </div>
      <div style={COMPOSER_STYLE}>
        <TextArea
          value={draft}
          onChange={(value) => setDraft(value)}
          placeholder="무엇을 만들까요?"
          rows={3}
          maxLength={1000}
        />
        <Button
          variant="solid"
          size="md"
          className="w-full"
          disabled={!draft.trim() || busy}
          loading={busy}
          onClick={send}
        >
          생성하기
        </Button>
      </div>
    </aside>
  )
}

const bubbleStyle = (role: Line["role"]): React.CSSProperties => ({
  alignSelf: role === "me" ? "flex-end" : "flex-start",
  maxWidth: "85%",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  backgroundColor: role === "me" ? COLOR.ACCENT_BG : COLOR.BG_SECTION,
  color: COLOR.TEXT_PRIMARY,
  ...TYPOGRAPHY.STYLE.BODY_2,
})

// 측면 도크 — 320px 고정폭 플로팅 패널(보더 없음, round+shadow).
const DOCK_PANEL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "320px",
  flexShrink: 0,
  height: "100%",
  overflow: "hidden",
  borderRadius: LAYOUT.PANEL_RADIUS,
  boxShadow: SHADOW.PANEL,
  backgroundColor: COLOR.PANEL_BG,
}

const LOG_STYLE: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  padding: SPACING["4"],
}

const COMPOSER_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  padding: SPACING["3"],
  borderTop: `1px solid ${COLOR.BORDER_DEFAULT}`,
}

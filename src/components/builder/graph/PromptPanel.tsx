"use client"

import { type FC, useState } from "react"
import { Button, TextArea } from "@/components/ui"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, SHADOW, LAYOUT } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { generateGraph, saveProjectGraph } from "@/lib/graph/api"
import { useGenerationProgress } from "@/lib/builder/useGenerationProgress"

// AI 대화 도크(ASS-093) — 자연어 → ProjectGraph 생성 → 현재 프로젝트에 적재·영속.
// 측면 플로팅 패널. 좌·우 배치는 GraphShell이 렌더 순서로 결정. 빈 그래프에서도 같은 도크로 시작한다(ASS-207).
type Line = { role: "ai" | "me"; text: string }

const GREETING: Line = { role: "ai", text: "안녕하세요! 무엇을 만들까요? 화면이나 기능을 설명해 주세요." }

export const PromptPanel: FC = () => {
  const [lines, setLines] = useState<Line[]>([GREETING])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const progress = useGenerationProgress(busy)

  // 자연어 → 생성 → 이 프로젝트에 저장 → 그래프 로드(빈 그래프면 캔버스가 채워진다).
  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setLines((prev) => [...prev, { role: "me", text }])
    setDraft("")
    try {
      const graph = await generateGraph(text)
      const { projectId, load } = useGraphStore.getState()
      // preview는 픽스처용 — 저장 스킵. 실 프로젝트만 영속(생성 결과 즉시 저장).
      if (projectId && projectId !== "preview") {
        await saveProjectGraph(projectId, text, graph)
      }
      load(projectId ?? "preview", graph)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."
      setLines((prev) => [...prev, { role: "ai", text: message }])
    } finally {
      setBusy(false)
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

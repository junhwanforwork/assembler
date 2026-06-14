"use client"

import { type FC, useState } from "react"
import { Button, TextArea } from "@/components/ui"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// 우측 상시 AI 대화 패널 (ASS-028 skeleton). 생성 배선(ASS-018/037) 전까지 UI + 로컬 대화 상태만.
type Line = { role: "ai" | "me"; text: string }

const GREETING: Line = { role: "ai", text: "안녕하세요! 무엇을 만들까요? 화면이나 기능을 설명해 주세요." }

export const PromptPanel: FC = () => {
  const [lines, setLines] = useState<Line[]>([GREETING])
  const [draft, setDraft] = useState("")

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setLines((prev) => [
      ...prev,
      { role: "me", text },
      { role: "ai", text: "생성 기능을 준비하고 있어요. 곧 이 대화로 화면을 만들 수 있어요." },
    ])
    setDraft("")
  }

  return (
    <aside style={PANEL_STYLE} aria-label="AI 대화">
      <div style={LOG_STYLE}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              alignSelf: line.role === "me" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: `${SPACING["2"]} ${SPACING["3"]}`,
              borderRadius: RADIUS.MD,
              backgroundColor: line.role === "me" ? COLOR.ACCENT_BG : COLOR.BG_SECTION,
              color: COLOR.TEXT_PRIMARY,
              ...TYPOGRAPHY.STYLE.BODY_2,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <div style={COMPOSER_STYLE}>
        <TextArea
          value={draft}
          onChange={(value) => setDraft(value)}
          placeholder="무엇을 만들까요?"
          rows={3}
          maxLength={1000}
        />
        <Button variant="solid" size="md" className="w-full" disabled={!draft.trim()} onClick={send}>
          생성하기
        </Button>
      </div>
    </aside>
  )
}

const PANEL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "320px",
  flexShrink: 0,
  height: "100%",
  borderLeft: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
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

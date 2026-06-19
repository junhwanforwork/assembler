"use client"

import { type FC, useState } from "react"
import { Button, TextArea } from "@/components/ui"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, SHADOW } from "@/lib/design-tokens"

// AI 대화 패널 (ASS-028 skeleton). 생성 배선(ASS-018/037) 전까지 UI + 로컬 대화 상태만.
// 위치는 GraphShell이 결정 — variant로 모양만 전환(dock=측면, hero=빈 그래프 중앙 카드, builder-layout.md §1·§4).
type Line = { role: "ai" | "me"; text: string }
type PromptVariant = "dock" | "hero"

const GREETING: Line = { role: "ai", text: "안녕하세요! 무엇을 만들까요? 화면이나 기능을 설명해 주세요." }

// dock 측면: 좌측이면 오른쪽 보더, 우측이면 왼쪽 보더(셸 본문 경계).
export const PromptPanel: FC<{ variant?: PromptVariant; side?: "left" | "right" }> = ({
  variant = "dock",
  side = "right",
}) => {
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

  const isHero = variant === "hero"

  return (
    <aside style={isHero ? HERO_PANEL_STYLE : dockPanelStyle(side)} aria-label="AI 대화">
      {isHero ? (
        <div style={HERO_INTRO_STYLE}>
          <h2 style={{ ...TYPOGRAPHY.STYLE.H2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
            대화하면 기획이 완성돼요
          </h2>
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: 0 }}>
            만들고 싶은 제품을 설명해 주세요. 요구사항부터 화면·API까지 연결된 그래프로 만들어 드려요.
          </p>
        </div>
      ) : (
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
      )}
      <div style={isHero ? HERO_COMPOSER_STYLE : COMPOSER_STYLE}>
        <TextArea
          value={draft}
          onChange={(value) => setDraft(value)}
          placeholder="무엇을 만들까요?"
          rows={isHero ? 4 : 3}
          maxLength={1000}
        />
        <Button
          variant="solid"
          size={isHero ? "lg" : "md"}
          className="w-full"
          disabled={!draft.trim()}
          onClick={send}
        >
          {isHero ? "기획 시작하기" : "생성하기"}
        </Button>
      </div>
      {/* 주제 추천·파일 업로드로 시작 칩은 ASS-059/066 범위 — 이번엔 중앙 배치까지만. */}
    </aside>
  )
}

// 측면 도크 — 320px 고정폭. 좌측 도크면 borderRight, 우측이면 borderLeft.
function dockPanelStyle(side: "left" | "right"): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    width: "320px",
    flexShrink: 0,
    height: "100%",
    [side === "left" ? "borderRight" : "borderLeft"]: `1px solid ${COLOR.BORDER_DEFAULT}`,
    backgroundColor: COLOR.BG_SURFACE,
  }
}

// 히어로 — 빈 그래프에서 화면 중앙 카드(최대폭 560px).
const HERO_PANEL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["5"],
  width: "100%",
  maxWidth: "560px",
  padding: SPACING["8"],
  borderRadius: RADIUS.XL,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
  boxShadow: SHADOW.CARD,
}

const HERO_INTRO_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
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

const HERO_COMPOSER_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
}

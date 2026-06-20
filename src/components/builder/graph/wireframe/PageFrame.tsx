"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { elementsOfPage } from "@/lib/graph/selectors"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { frameWidth, frameHeight } from "./canvas-geometry"
import { ElementNode } from "./ElementNode"

// 데스크탑 콘텐츠 컬럼 — 1920 폭 한가운데 좁은 폼(로그인이 실제 로그인 화면처럼). 모바일은 폰 폭 그대로.
const DESKTOP_CONTENT_MAX = 480

// 와이어프레임 화면(스크린) — 제목 헤더 없이 요소만 렌더한다(제목·드래그는 WireframeBoard 소유).
// desktop: 1920×1080 고정 16:9, 콘텐츠 수직·수평 중앙 컬럼. mobile/tablet: device 폭 세로 스택(auto 높이) 폰 low-fi.
export const PageFrame: FC<{ page: Page; graph: ProjectGraph; active: boolean }> = ({ page, graph, active }) => {
  const width = frameWidth(page)
  const elements = elementsOfPage(graph, page.id)
  const isDesktop = page.device === "desktop"

  const body = (
    <div style={isDesktop ? DESKTOP_COLUMN : MOBILE_STACK}>
      {elements.length === 0 ? (
        <p style={EMPTY}>빈 화면이에요. 왼쪽 탐색기에서 요소를 추가해 보세요.</p>
      ) : (
        elements.map((el, i) => (
          <ElementNode key={el.id} element={el} graph={graph} index={i + 1} active={active} />
        ))
      )}
    </div>
  )

  return (
    <div
      style={{
        ...SCREEN,
        width,
        height: isDesktop ? frameHeight(page) : undefined,
        minHeight: isDesktop ? undefined : 160,
        justifyContent: isDesktop ? "center" : "flex-start",
        alignItems: isDesktop ? "center" : "stretch",
      }}
    >
      {body}
    </div>
  )
}

const SCREEN: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_BASE, // 화면 본문 = 중성 "종이"
  overflow: "hidden",
}

// 데스크탑 16:9 중앙 컬럼 — 좁은 폭으로 모아 실제 화면 폼처럼.
const DESKTOP_COLUMN: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  width: "100%",
  maxWidth: DESKTOP_CONTENT_MAX,
}

const MOBILE_STACK: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  width: "100%",
}

const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }

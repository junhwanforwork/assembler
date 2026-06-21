"use client"

import { useEffect, useRef, useState, type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { elementsOfPage } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { deviceAspect } from "./canvas-geometry"
import { ElementNode } from "./ElementNode"

// 데스크탑 콘텐츠 컬럼 — 16:9 프레임 한가운데 좁은 폼(로그인이 실제 로그인 화면처럼). 모바일은 폰 폭 그대로.
const DESKTOP_CONTENT_MAX = 480

// 포커스 뷰어 화면 프레임 — 가용 영역(부모 flex)에 디바이스 aspect를 유지해 fit(중앙).
// 축소(transform scale) 안 함 → 콘텐츠는 1x 가독 크기로 렌더하고, 프레임보다 길면 프레임 안에서 세로 스크롤(ASS-081).
// 제목 헤더는 WireframeView(보드)가 소유한다 — 여기는 디바이스 창 + 요소만.
export const PageFrame: FC<{ page: Page; graph: ProjectGraph; active: boolean }> = ({ page, graph, active }) => {
  const elements = elementsOfPage(graph, page.id)
  const isDesktop = page.device === "desktop"

  const areaRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null)

  // 가용 영역 측정 → aspect 유지 최대 박스 계산(width·height 중 작은 쪽 기준). 리사이즈 추종.
  useEffect(() => {
    const node = areaRef.current
    if (!node) return
    const aspect = deviceAspect(page.device)
    const recalc = () => {
      const aw = node.clientWidth
      const ah = node.clientHeight
      if (aw <= 0 || ah <= 0) return
      const byWidth = { width: aw, height: aw / aspect }
      const next = byWidth.height <= ah ? byWidth : { width: ah * aspect, height: ah }
      setFrame({ width: Math.round(next.width), height: Math.round(next.height) })
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(node)
    return () => ro.disconnect()
  }, [page.device])

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
    <div ref={areaRef} style={AREA}>
      <div
        style={{
          ...SCREEN,
          width: frame?.width ?? "100%",
          height: frame?.height ?? "100%",
          justifyContent: isDesktop ? "center" : "flex-start",
        }}
      >
        {body}
      </div>
    </div>
  )
}

// 화면을 감싸는 가용 영역 — 부모 flex가 주는 공간을 채우고 프레임을 중앙에 둔다.
const AREA: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
}

// 디바이스 창 — aspect로 fit된 고정 크기. 콘텐츠가 길면 이 안에서 세로 스크롤.
const SCREEN: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_BASE, // 화면 본문 = 중성 "종이"
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  borderRadius: RADIUS.LG,
  overflowY: "auto",
  overflowX: "hidden",
}

// 데스크탑 콘텐츠 — 좁은 폭 중앙 컬럼으로 모아 실제 화면 폼처럼.
const DESKTOP_COLUMN: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  width: "100%",
  maxWidth: DESKTOP_CONTENT_MAX,
  margin: "0 auto",
}

const MOBILE_STACK: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  width: "100%",
}

const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }

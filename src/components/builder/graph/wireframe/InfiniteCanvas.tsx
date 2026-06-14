"use client"

import { type CSSProperties, type FC, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { COLOR, RADIUS, SHADOW, TYPOGRAPHY } from "@/lib/design-tokens"
import { type Bounds } from "./canvas-geometry"
import { CanvasContext } from "./canvas-context"
import { useCanvasViewport } from "./useCanvasViewport"

// 무한 캔버스 컨테이너 — 변환 레이어에 children(프레임) 배치 + 팬/줌. 빈 공간 드래그=팬, 배경 클릭=onBackgroundClick.
export const InfiniteCanvas: FC<{
  children: ReactNode
  contentBounds?: Bounds
  onBackgroundClick?: () => void
}> = ({ children, contentBounds, onBackgroundClick }) => {
  const { containerRef, viewport, startPan, zoomBy, reset, fit } = useCanvasViewport()

  const handlePointerDown = (e: ReactPointerEvent) => {
    onBackgroundClick?.()
    startPan(e)
  }

  return (
    <div ref={containerRef} onPointerDown={handlePointerDown} style={CONTAINER}>
      <CanvasContext.Provider value={{ zoom: viewport.zoom, focusBounds: fit }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
          }}
        >
          {children}
        </div>
      </CanvasContext.Provider>

      <div style={CONTROLS} onPointerDown={(e) => e.stopPropagation()}>
        <CtrlButton label="축소하기" onClick={() => zoomBy(1 / 1.2)}>−</CtrlButton>
        <span style={ZOOM_LABEL}>{Math.round(viewport.zoom * 100)}%</span>
        <CtrlButton label="확대하기" onClick={() => zoomBy(1.2)}>+</CtrlButton>
        <CtrlButton label="100%로 보기" onClick={reset}>1:1</CtrlButton>
        {contentBounds ? (
          <CtrlButton label="전체 보기" onClick={() => fit(contentBounds)}>핏</CtrlButton>
        ) : null}
      </div>
    </div>
  )
}

const CtrlButton: FC<{ label: string; onClick: () => void; children: ReactNode }> = ({
  label,
  onClick,
  children,
}) => (
  <button type="button" aria-label={label} onClick={onClick} style={CTRL_BTN}>
    {children}
  </button>
)

const CONTAINER: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: COLOR.BG_BASE,
  cursor: "grab",
  touchAction: "none",
}

const CONTROLS: CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: 4,
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
  boxShadow: SHADOW.DROPDOWN,
}

const CTRL_BTN: CSSProperties = {
  minWidth: 28,
  height: 28,
  padding: "0 6px",
  border: "none",
  borderRadius: RADIUS.SM,
  background: "transparent",
  color: COLOR.TEXT_SECONDARY,
  cursor: "pointer",
  ...TYPOGRAPHY.STYLE.LABEL_2,
}

const ZOOM_LABEL: CSSProperties = {
  minWidth: 38,
  textAlign: "center",
  color: COLOR.TEXT_MUTED,
  ...TYPOGRAPHY.STYLE.LABEL_2,
}

"use client"

import { createContext, useContext } from "react"
import { type Bounds } from "./canvas-geometry"

// 프레임이 드래그 델타를 world 단위로 보정(/zoom)하고, 헤더 더블클릭 포커스를 호출하기 위한 캔버스 컨텍스트.
type CanvasCtx = {
  zoom: number
  focusBounds: (b: Bounds) => void
}

export const CanvasContext = createContext<CanvasCtx>({ zoom: 1, focusBounds: () => {} })
export const useCanvas = () => useContext(CanvasContext)

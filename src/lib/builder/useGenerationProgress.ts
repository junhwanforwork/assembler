"use client"

import { useEffect, useState } from "react"

// 생성은 단일 블로킹 호출(스트리밍 P0 착지 전)이라 백엔드 단계 신호가 없다.
// 빈 스피너의 "멈춘 느낌"을 줄이려, 만들어지는 Source-of-Truth 체인을 시간 경과로 안내한다.
// 실제 단계 상태가 아니라 진행 안내다 — P0 스트리밍이 실제 레이어 신호를 주면 그 값으로 교체한다.
const STAGES = [
  "요구사항을 정리하고 있어요",
  "기능을 정의하고 있어요",
  "화면을 그리고 있어요",
  "API·데이터를 잇고 있어요",
  "거의 다 됐어요. 조금만 더요",
] as const

const STAGE_INTERVAL_MS = 6000

// active 동안 interval 콜백에서만 단계를 올리고, 비활성으로 끝날 때 cleanup 에서 0으로 되돌린다.
// (effect 본문에서 동기 setState 를 호출하지 않아 cascading render 를 피한다.)
export function useGenerationProgress(active: boolean): string | null {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setStage((prev) => Math.min(prev + 1, STAGES.length - 1))
    }, STAGE_INTERVAL_MS)
    return () => {
      clearInterval(id)
      setStage(0)
    }
  }, [active])

  return active ? STAGES[stage] : null
}

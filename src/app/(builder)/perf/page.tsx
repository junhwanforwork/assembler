"use client"

import { type CSSProperties, useEffect, useSyncExternalStore } from "react"
import { GraphShell } from "@/components/builder/graph/GraphShell"
import { FlowCanvas } from "@/components/builder/flow/FlowCanvas"
import { useBuilderStore } from "@/lib/store/builder"
import { SAMPLE_GRAPH } from "@/lib/fixtures/sample-graph"
import { SAMPLE_PROJECT } from "@/lib/fixtures/sample-project"

// perf 계측 하네스 (개발 전용, 무인증·AI 0). e2e/perf.spec.ts가 ?perf=1로 구동해
// 프레임/커밋 마크를 트랜스크립트에 찍는다. 인터랙션별로 결정적 표면을 분기한다:
//   ?surface=flow → FlowCanvas(flow-drag, 빌더 스토어 시드)
//   그 외         → GraphShell(wireframe-load + inspector-commit, /preview와 동일 그래프 스토어)
// canvas-pan(InfiniteCanvas)은 미배포 → 여기서도 deferred(배포 시 별도 분기 추가).
export default function PerfHarnessPage() {
  // 서버/첫 클라 렌더는 "graph"로 일치(hydration mismatch 방지) → 마운트 후 search param 반영.
  const surface = useSyncExternalStore(subscribeNoop, getSurfaceSnapshot, getServerSurface)

  if (surface === "flow") return <FlowHarness />
  return <GraphShell projectId="perf" initialGraph={SAMPLE_GRAPH} />
}

const subscribeNoop = () => () => {}
const getServerSurface = (): "graph" | "flow" => "graph"
const getSurfaceSnapshot = (): "graph" | "flow" =>
  new URLSearchParams(window.location.search).get("surface") === "flow" ? "flow" : "graph"

// 빌더 스토어를 픽스처로 시드하고 플로우 뷰를 채워 FlowCanvas만 렌더한다(드래그 표면).
function FlowHarness() {
  const ready = useBuilderStore((s) => s.screens.length > 0 && s.view === "flow")

  useEffect(() => {
    const store = useBuilderStore.getState()
    store.load(SAMPLE_PROJECT)
    store.setView("flow")
  }, [])

  if (!ready) return null
  return (
    <div style={FLOW_FRAME}>
      <FlowCanvas />
    </div>
  )
}

const FLOW_FRAME: CSSProperties = { height: "100vh", width: "100%" }

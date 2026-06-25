"use client"

import { type FC, useEffect, useSyncExternalStore } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { useGraphAutosave } from "@/hooks/useGraphAutosave"
import { isGraphEmpty } from "@/lib/graph/selectors"
import { COLOR, LAYOUT, SHADOW } from "@/lib/design-tokens"
import { GraphHeader } from "./GraphHeader"
import { ExplorerTree } from "./ExplorerTree"
import { PromptPanel } from "./PromptPanel"
import { CanvasTabs } from "./CanvasTabs"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { GraphInspector } from "./inspector/GraphInspector"

// 빌더 셸 (ASS-025 → ASS-070 통합 트리 → ASS-071 뷰탭 → ASS-072 채팅 위치 → ASS-207 빈=풀 chrome).
// 빈 그래프도 풀 워크스페이스 chrome으로 진입한다(트리·빈 캔버스·채팅 도크) — 첫 방문부터 구조를 보여준다.
//   빈 그래프(객체 0) → 트리(카운트 0) + CanvasEmptyState + 채팅 도크(선호 무관 강제 표시).
//   작업 있음 → 동일 chrome + 캔버스 뷰탭 + 채팅 도크(chatVisible·chatSide preference).
export const GraphShell: FC<{ projectId: string; initialGraph: ProjectGraph }> = ({
  projectId,
  initialGraph,
}) => {
  const load = useGraphStore((s) => s.load)
  const graph = useGraphStore((s) => s.graph)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const chatVisible = useGraphStore((s) => s.chatVisible)
  const chatSide = useGraphStore((s) => s.chatSide)

  // 변경 → 2초 디바운스 저장(preview는 내부에서 스킵). 실 프로젝트만 영속.
  useGraphAutosave()

  // 채팅 위치 preference는 localStorage 기반 → 서버 HTML과 다를 수 있어, 마운트 후에만 반영(hydration mismatch 방지).
  // useSyncExternalStore: 서버 스냅샷 false, 클라 스냅샷 true → 첫 클라 렌더는 서버와 일치, 이후 true로 전환.
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot)

  useEffect(() => {
    load(projectId, initialGraph)
  }, [projectId, initialGraph, load])

  if (!graph) {
    return <div style={{ ...SHELL_STYLE, alignItems: "center", justifyContent: "center" }} />
  }

  const empty = isGraphEmpty(graph)

  // 마운트 전엔 preference 미반영(기본 우측·표시) → 서버/클라 첫 렌더 일치.
  // 빈 그래프에선 도크가 유일한 입력 수단이라 선호(숨김)와 무관하게 항상 표시한다(입력 막힘 방지).
  // side는 도크의 좌·우 렌더 슬롯만 결정한다(아래 BODY 배치). 패널 모양은 PromptPanel이 자체 소유.
  const showChat = empty || !mounted || chatVisible
  const side = mounted ? chatSide : "right"
  const chatDock = showChat ? <PromptPanel /> : null

  // 우측 도크는 요소 선택 시 GraphInspector(매핑 편집)만 (ASS-070 동작).
  // Description은 사이드바에서 빠져 캔버스 화면 옆 보드(CanvasDescription)로 이동했다 (ASS-078).
  const rightDock = selectedElementId ? (
    <aside style={INSPECTOR_STYLE} aria-label="요소 매핑 편집">
      <GraphInspector graph={graph} />
    </aside>
  ) : null

  return (
    <div style={SHELL_STYLE}>
      <GraphHeader />
      <div style={BODY_STYLE}>
        {side === "left" ? chatDock : null}
        <ExplorerTree />
        <main style={CANVAS_STYLE}>
          {empty ? (
            <CanvasEmptyState />
          ) : (
            // 노드가 바뀌면 remount → 활성 탭이 기본 탭으로 리셋(CanvasTabs 내부 로컬 state).
            <CanvasTabs key={`${selectedNode?.type ?? "root"}:${selectedNode?.id ?? ""}`} />
          )}
        </main>
        {rightDock}
        {side === "right" ? chatDock : null}
      </div>
    </div>
  )
}

// 클라이언트 마운트 게이트 — 구독 변화 없음(한 번 true로 굳음).
const subscribeNoop = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

const SHELL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: COLOR.BG_BASE,
}

// 플로팅 셸: 패널을 BG_BASE 배경 위에 gap+round+shadow 로 띄운다 (보더 없음, Stitch 구조).
const BODY_STYLE: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  gap: LAYOUT.PANEL_GAP,
  padding: LAYOUT.PANEL_GAP,
  backgroundColor: COLOR.BG_BASE,
}

const CANVAS_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: "100%",
  minHeight: 0,
  overflow: "hidden", // 스크롤은 CanvasTabs 콘텐츠 영역이 소유 (탭바 고정) + 라운드 클립
  backgroundColor: COLOR.PANEL_BG,
  borderRadius: LAYOUT.PANEL_RADIUS,
  boxShadow: SHADOW.PANEL,
}

const INSPECTOR_STYLE: React.CSSProperties = {
  width: "300px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: "12px",
  borderRadius: LAYOUT.PANEL_RADIUS,
  boxShadow: SHADOW.PANEL,
  backgroundColor: COLOR.PANEL_BG,
}

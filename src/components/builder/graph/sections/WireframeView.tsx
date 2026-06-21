"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { incompleteCount } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { PageFrame } from "../wireframe/PageFrame"
import { CanvasDescription } from "../wireframe/CanvasDescription"
import { PageNav } from "../wireframe/PageNav"

// 화면(Wireframe) 섹션 — 포커스 단일 페이지 뷰어(manyfast식, ASS-081).
// 인피니트 캔버스가 아니라 선택 페이지 1개를 디바이스 프레임으로 뷰포트에 fit + 옆 Description.
// 선택 페이지 없으면 첫 페이지로 폴백. 페이지 0개면 빈 안내. 흐름 탭(StructureView)이 전체 맵을 담당.
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  if (!graph) return null

  if (graph.pages.length === 0) {
    return (
      <div style={EMPTY_WRAP}>
        <p style={EMPTY}>아직 화면이 없어요. 왼쪽 탐색기에서 화면을 추가해 보세요.</p>
      </div>
    )
  }

  // selectedPageId가 화면이 아니면(요소·root 등 다른 노드 선택) 첫 화면으로 폴백 — 항상 한 페이지를 보여준다.
  const page = graph.pages.find((p) => p.id === selectedPageId) ?? graph.pages[0]

  return (
    <div style={ROOT}>
      <FocusedBoard page={page} graph={graph} pages={graph.pages} />
    </div>
  )
}

// 포커스 보드 — 제목 1줄(page.name + device + ⚠N + prev/next) + 본문 [Screen 프레임 | Description].
const FocusedBoard: FC<{ page: Page; graph: ProjectGraph; pages: Page[] }> = ({ page, graph, pages }) => {
  const incomplete = incompleteCount(graph, page.id)

  return (
    <section style={BOARD}>
      <header style={HEADER}>
        <span style={TITLE}>{page.name}</span>
        <span style={DEVICE}>{page.device}</span>
        {incomplete > 0 ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> {incomplete}
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        <PageNav pages={pages} currentId={page.id} />
      </header>
      <div style={BODY}>
        <PageFrame page={page} graph={graph} active />
        <CanvasDescription page={page} graph={graph} />
      </div>
    </section>
  )
}

const ROOT: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  padding: SPACING["6"],
  boxSizing: "border-box",
  backgroundColor: COLOR.BG_BASE,
}

// 보드 = 가용 영역을 채우는 한 카드(제목 1개 + 본문). 캔버스와 분리감.
const BOARD: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
  overflow: "hidden",
}

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  height: 44,
  padding: `0 ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
}

const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, minWidth: 0 }
const DEVICE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }
const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}

// 본문 = [Screen 프레임 | Description] 가로 배치. Screen은 가용 영역 fit, Description 고정 폭.
const BODY: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
}

const EMPTY_WRAP: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACING["6"],
  backgroundColor: COLOR.BG_BASE,
}

const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }

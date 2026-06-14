"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, isMappingComplete } from "@/lib/graph/selectors"
import { BlockRenderer } from "@/components/builder/screen/BlockRenderer"
import type { UIElement } from "@/lib/types/assembler"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// Wireframe 섹션 — 선택 페이지의 UI Element 스택을 BlockRenderer로 렌더 + 매핑 미완성 ⚠.
// 무한 캔버스(프레임 배치·줌/팬·엣지)는 ASS-033/034. 여기선 단일 페이지 상세 스택.
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectElement = useGraphStore((s) => s.selectElement)
  if (!graph) return null

  const page = graph.pages.find((p) => p.id === selectedPageId)
  if (!page) {
    return <Center>왼쪽에서 페이지를 선택해 주세요.</Center>
  }
  const elements = elementsOfPage(graph, page.id)

  return (
    <div style={PAGE_STYLE}>
      <div style={FRAME_STYLE}>
        <div style={FRAME_HEADER_STYLE}>
          <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD, color: COLOR.TEXT_PRIMARY }}>
            {page.name}
          </span>
        </div>
        {elements.length === 0 ? (
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, padding: SPACING["4"], margin: 0 }}>
            아직 UI 요소가 없어요.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: SPACING["3"], padding: SPACING["4"] }}>
            {elements.map((el) => (
              <ElementRow
                key={el.id}
                element={el}
                active={selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ElementRow({ element, active, onSelect }: { element: UIElement; active: boolean; onSelect: () => void }) {
  const complete = isMappingComplete(element)
  return (
    <div
      onClick={onSelect}
      style={{
        padding: SPACING["3"],
        borderRadius: RADIUS.MD,
        border: `1px solid ${active ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
        backgroundColor: COLOR.BG_BASE,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SPACING["2"], marginBottom: SPACING["2"] }}>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>{element.name}</span>
        {!complete ? <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.WARNING }}>⚠ 매핑 미완성</span> : null}
      </div>
      <BlockRenderer block={{ id: element.id, type: element.type, props: element.props }} />
      {active ? (
        <p style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["2"]} 0 0` }}>
          {element.action || "동작 없음"} → {element.result.kind}
          {element.apiIds.length > 0 ? ` · API ${element.apiIds.length}` : ""}
          {element.databaseIds.length > 0 ? ` · DB ${element.databaseIds.length}` : ""}
        </p>
      ) : null}
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_MUTED }}>{children}</p>
    </div>
  )
}

const PAGE_STYLE: React.CSSProperties = {
  padding: SPACING["8"],
  display: "flex",
  justifyContent: "center",
}

const FRAME_STYLE: React.CSSProperties = {
  width: "360px",
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
  overflow: "hidden",
}

const FRAME_HEADER_STYLE: React.CSSProperties = {
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}

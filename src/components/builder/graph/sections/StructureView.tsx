"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { pagesByFeature, incompleteCount } from "@/lib/graph/selectors"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// Structure 섹션 — IA(Feature 그룹별 페이지) + UserFlow(이동) 한 화면.
// 정식 페이지 맵(노드+엣지 캔버스)은 ASS-032. 여기선 그룹 목록 + 플로우 목록의 실데이터 렌더.
export const StructureView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const setSection = useGraphStore((s) => s.setSection)
  const selectPage = useGraphStore((s) => s.selectPage)
  if (!graph) return null

  const groups = pagesByFeature(graph)
  const pageName = (id: string) => graph.pages.find((p) => p.id === id)?.name ?? "(삭제됨)"
  const featureName = (id: string) => (id === "" ? "미분류" : graph.features.find((f) => f.id === id)?.name ?? "기능")

  const openInWireframe = (pageId: string) => {
    selectPage(pageId)
    setSection("wireframe")
  }

  return (
    <div style={PAGE_STYLE}>
      <h1 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>구조 (IA + 흐름)</h1>

      {[...groups.entries()].map(([featureId, pages]) => (
        <section key={featureId || "_none"} style={{ marginTop: SPACING["6"] }}>
          <p style={{ ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `0 0 ${SPACING["2"]}` }}>
            {featureName(featureId)}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: SPACING["3"] }}>
            {pages.map((p) => {
              const warn = incompleteCount(graph, p.id)
              return (
                <button key={p.id} type="button" onClick={() => openInWireframe(p.id)} style={NODE_STYLE}>
                  <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD, color: COLOR.TEXT_PRIMARY }}>
                    {p.name}
                  </span>
                  {warn > 0 ? (
                    <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.WARNING }}>⚠ {warn}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <section style={{ marginTop: SPACING["8"] }}>
        <p style={{ ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `0 0 ${SPACING["2"]}` }}>
          화면 흐름 ({graph.userFlow.edges.length})
        </p>
        {graph.userFlow.edges.length === 0 ? (
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
            아직 화면 간 이동이 없어요.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: SPACING["1"] }}>
            {graph.userFlow.edges.map((e) => (
              <div key={e.id} style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }}>
                {pageName(e.fromPageId)} → {pageName(e.toPageId)}
                {e.condition ? <span style={{ color: COLOR.TEXT_MUTED }}> · {e.condition}</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: "880px",
  margin: "0 auto",
  padding: `${SPACING["8"]} ${SPACING["6"]}`,
}

const NODE_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  minWidth: "140px",
  padding: `${SPACING["3"]} ${SPACING["4"]}`,
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
  cursor: "pointer",
  textAlign: "left",
}

"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { apiUsedBy, databaseUsedBy } from "@/lib/graph/selectors"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// API·데이터 섹션 — Api·Database를 표/카드로. 인라인 편집·행 추가는 ASS-036.
export const ApiDataView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null

  return (
    <div style={PAGE_STYLE}>
      <h1 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>API · 데이터</h1>

      <p style={LABEL}>API ({graph.apis.length})</p>
      {graph.apis.length === 0 ? (
        <Empty>아직 API가 없어요.</Empty>
      ) : (
        graph.apis.map((a) => {
          const used = apiUsedBy(graph, a.id)
          return (
            <div key={a.id} style={CARD}>
              <p style={TITLE}>
                <code style={{ color: COLOR.ACCENT }}>{a.method}</code> {a.path}
              </p>
              {a.purpose ? <p style={BODY}>{a.purpose}</p> : null}
              <p style={META}>요소 {used.elementIds.length} · 페이지 {used.pageIds.length}에서 사용</p>
            </div>
          )
        })
      )}

      <p style={LABEL}>Database ({graph.databases.length})</p>
      {graph.databases.length === 0 ? (
        <Empty>아직 테이블이 없어요.</Empty>
      ) : (
        graph.databases.map((d) => {
          const used = databaseUsedBy(graph, d.id)
          return (
            <div key={d.id} style={CARD}>
              <p style={TITLE}><code>{d.name}</code></p>
              {d.purpose ? <p style={BODY}>{d.purpose}</p> : null}
              {d.columns.length > 0 ? (
                <ul style={{ margin: `${SPACING["1"]} 0 0`, paddingLeft: "18px" }}>
                  {d.columns.map((c, i) => (
                    <li key={i} style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>{c}</li>
                  ))}
                </ul>
              ) : null}
              <p style={META}>기능 {used.featureIds.length} · API {used.apiIds.length}에서 참조</p>
            </div>
          )
        })
      )}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>{children}</p>
}

const PAGE_STYLE: React.CSSProperties = { maxWidth: "760px", margin: "0 auto", padding: `${SPACING["8"]} ${SPACING["6"]}` }
const LABEL: React.CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `${SPACING["6"]} 0 ${SPACING["2"]}` }
const CARD: React.CSSProperties = { padding: SPACING["4"], borderRadius: RADIUS.LG, border: `1px solid ${COLOR.BORDER_DEFAULT}`, backgroundColor: COLOR.BG_SECTION, marginBottom: SPACING["2"] }
const TITLE: React.CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_1, fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD, color: COLOR.TEXT_PRIMARY, margin: 0 }
const BODY: React.CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["1"]} 0 0` }
const META: React.CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: `${SPACING["2"]} 0 0` }

"use client"

import { type CSSProperties, type FC, useMemo, useState } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import { TreeNav, type TreeNode } from "@/components/builder/graph/tree/TreeNav"
import { RequirementDetail } from "./doc/RequirementDetail"

// 문서 캔버스 (그림2-doc) — 3분할: ① 요구사항 목록(개수 뱃지) ② 기능·상세기능 트리 ③ 상세 패널.
// 선택은 로컬 state(문서 안에서만 — 캔버스 탭/노드 선택과 분리). 기본 = 첫 요구사항.
export const DocView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const requirements = graph?.requirements ?? []
  const [selectedId, setSelectedId] = useState<string | null>(requirements[0]?.id ?? null)

  const selected = requirements.find((r) => r.id === selectedId) ?? requirements[0] ?? null

  // 중간 트리 — 선택 요구사항을 충족하는 기능 + 각 기능의 상세기능(잎).
  const featureNodes: TreeNode[] = useMemo(() => {
    if (!graph || !selected) return []
    return graph.features
      .filter((f) => f.requirementIds.includes(selected.id))
      .map((f) => ({
        id: f.id,
        label: f.name,
        children: (f.detailFeatures ?? []).map((d) => ({ id: d.id, label: d.label })),
      }))
  }, [graph, selected])

  if (!graph) return null

  return (
    <div style={GRID}>
      {/* ① 요구사항 목록 */}
      <aside style={COL_LIST} aria-label="요구사항 목록">
        <p style={COL_TITLE}>요구사항</p>
        {requirements.length === 0 ? (
          <p style={EMPTY}>아직 요구사항이 없어요.</p>
        ) : (
          requirements.map((r) => {
            const count = graph.features.filter((f) => f.requirementIds.includes(r.id)).length
            const active = r.id === selected?.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                style={reqRow(active)}
              >
                <span style={REQ_LABEL}>{r.title}</span>
                <span style={BADGE}>{count}</span>
              </button>
            )
          })
        )}
      </aside>

      {/* ② 기능 / 상세기능 트리 */}
      <section style={COL_TREE} aria-label="기능 및 상세기능">
        <p style={COL_TITLE}>기능 / 상세 기능</p>
        {featureNodes.length === 0 ? (
          <p style={EMPTY}>이 요구사항에 연결된 기능이 없어요.</p>
        ) : (
          <TreeNav nodes={featureNodes} label="기능 및 상세기능" />
        )}
      </section>

      {/* ③ 상세 패널 */}
      <section style={COL_DETAIL} aria-label="요구사항 상세">
        {selected ? (
          <RequirementDetail requirement={selected} graph={graph} />
        ) : (
          <p style={EMPTY}>요구사항을 선택해 주세요.</p>
        )}
      </section>
    </div>
  )
}

const GRID: CSSProperties = { display: "flex", height: "100%", minHeight: 0 }
const COL_LIST: CSSProperties = {
  width: 240,
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["3"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["1"],
}
const COL_TREE: CSSProperties = {
  width: 280,
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["3"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
}
const COL_DETAIL: CSSProperties = { flex: 1, minWidth: 0, height: "100%", overflowY: "auto" }

const COL_TITLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: `${SPACING["1"]} 0 ${SPACING["2"]}`,
  paddingLeft: SPACING["2"],
}
const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, padding: SPACING["2"] }

function reqRow(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING["2"],
    width: "100%",
    padding: `${SPACING["2"]} ${SPACING["2"]}`,
    border: "none",
    borderRadius: RADIUS.SM,
    cursor: "pointer",
    textAlign: "left",
    backgroundColor: active ? COLOR.ACCENT_BG : "transparent",
    color: active ? COLOR.ACCENT : COLOR.TEXT_SECONDARY,
    transition: INTERACTION.TRANSITION_BG,
  }
}
const REQ_LABEL: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}
const BADGE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  flexShrink: 0,
  minWidth: 18,
  textAlign: "center",
  color: COLOR.TEXT_MUTED,
}

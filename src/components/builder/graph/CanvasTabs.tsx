"use client"

import { type FC, useState } from "react"
import { useGraphStore, type GraphSection, type NodeType } from "@/lib/store/graph"
import { COLOR, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import { DocView } from "./sections/DocView"
import { StructureView } from "./sections/StructureView"
import { WireframeView } from "./sections/WireframeView"
import { ApiDataView } from "./sections/ApiDataView"

// 캔버스 뷰탭(ASS-071): 선택 노드를 여러 각도(화면/문서/흐름/표)로 본다.
// 노드 타입 → 탭셋·기본탭은 NODE_TABS 단일 출처(builder-layout.md §3 확정 표). 탭은 뷰 표현이라 store 영속 불필요.

// 탭 = GraphSection. 라벨은 명사(해요체 불필요). 콘텐츠는 기존 4종 section 뷰 재사용(무수정).
const TAB_LABEL: Record<GraphSection, string> = {
  wireframe: "화면",
  doc: "문서",
  structure: "흐름",
  apidata: "표",
}

// 노드 타입 → 탭셋(순서가 곧 탭 노출 순서) + 기본 탭. 표의 단일 출처.
const NODE_TABS: Record<NodeType, { tabs: GraphSection[]; default: GraphSection }> = {
  page: { tabs: ["wireframe", "doc", "structure"], default: "wireframe" },
  element: { tabs: ["wireframe"], default: "wireframe" },
  feature: { tabs: ["doc", "structure"], default: "doc" },
  requirement: { tabs: ["doc"], default: "doc" },
  root: { tabs: ["structure", "doc"], default: "structure" },
  api: { tabs: ["apidata"], default: "apidata" },
  database: { tabs: ["apidata"], default: "apidata" },
}

const SECTION_VIEW: Record<GraphSection, FC> = {
  doc: DocView,
  structure: StructureView,
  wireframe: WireframeView,
  apidata: ApiDataView,
}

// 노드가 바뀌면 GraphShell이 key로 remount → 활성 탭이 기본 탭으로 자연 리셋(간단·정확).
export const CanvasTabs: FC = () => {
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const nodeType: NodeType = selectedNode?.type ?? "root"
  const { tabs, default: defaultTab } = NODE_TABS[nodeType]

  const [active, setActive] = useState<GraphSection>(defaultTab)
  // 활성 탭이 현재 탭셋에 없으면(엣지케이스) 기본 탭으로 폴백.
  const current = tabs.includes(active) ? active : defaultTab
  const ActiveView = SECTION_VIEW[current]

  return (
    <div style={WRAP_STYLE} className="canvas_tabs_wrap">
      {tabs.length > 1 ? (
        <div style={TABBAR_STYLE} role="tablist" aria-label="캔버스 뷰">
          {tabs.map((tab) => (
            <TabButton key={tab} tab={tab} isActive={tab === current} onSelect={setActive} />
          ))}
        </div>
      ) : null}
      <div style={CONTENT_STYLE} className="canvas_tab_content_area">
        <ActiveView />
      </div>
    </div>
  )
}

const TabButton: FC<{
  tab: GraphSection
  isActive: boolean
  onSelect: (tab: GraphSection) => void
}> = ({ tab, isActive, onSelect }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(tab)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...TYPOGRAPHY.STYLE.LABEL_1,
        padding: "8px 14px",
        color: isActive ? COLOR.ACCENT : COLOR.TEXT_SECONDARY,
        borderBottom: `2px solid ${isActive ? COLOR.ACCENT : "transparent"}`,
        backgroundColor: !isActive && hovered ? INTERACTION.HOVER_BG_SURFACE : "transparent",
        transition: INTERACTION.TRANSITION_BG,
        cursor: "pointer",
      }}
    >
      {TAB_LABEL[tab]}
    </button>
  )
}

const WRAP_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
}

const TABBAR_STYLE: React.CSSProperties = {
  display: "flex",
  flexShrink: 0,
  gap: "2px",
  paddingInline: "8px",
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}

const CONTENT_STYLE: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
}

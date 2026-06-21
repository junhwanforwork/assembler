"use client"

import { useState, type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { ApiCatalogRow } from "./ApiCatalogRow"
import { ApiDetailPanel } from "./ApiDetailPanel"
import { endpointText } from "./api-catalog"
import type { ApiMenuAction } from "./ApiRowMenu"

// API Catalog Table (ASS-080) — 비개발자가 "이 API가 뭘 하는지" 읽는 테이블.
// Swagger 아님 — 비즈니스/오퍼레이션 뷰. 행 클릭 → 인라인 상세, 우측 kebab.
// API 노드가 선택돼 들어오면(selectedNode.type === "api") 해당 행 상세를 자동으로 연다.
const COLUMNS = [
  "API",
  "Endpoint",
  "이 화면에서 써요",
  "이 액션이 호출해요",
  "성공하면",
  "실패하면",
  "데이터베이스",
  "마지막 수정",
  "",
]

export const ApiCatalogTable: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const selectNode = useGraphStore((s) => s.selectNode)
  const addApi = useGraphStore((s) => s.addApi)

  // 선택된 API 노드가 있으면 그 행을 기본 오픈 — 트리에서 특정 API를 골라 들어온 경로.
  // selectedNode 변경 시 GraphShell이 key로 이 뷰를 remount → 초기값으로 자연 리셋(별도 effect 불필요).
  const initialOpen = selectedNode?.type === "api" ? selectedNode.id : null
  const [openId, setOpenId] = useState<string | null>(initialOpen)

  if (!graph) return null

  async function copyEndpoint(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 클립보드 거부 — 조용히 무시.
    }
  }

  function handleMenu(apiId: string, action: ApiMenuAction) {
    const api = graph?.apis.find((a) => a.id === apiId)
    if (!api) return
    if (action === "detail") {
      setOpenId((prev) => (prev === apiId ? null : apiId))
    } else if (action === "edit") {
      // 편집은 API 노드 선택으로 라우팅(상세 오픈) — 인라인 편집 후속(ASS-081).
      selectNode("api", apiId)
      setOpenId(apiId)
    } else if (action === "copyEndpoint") {
      void copyEndpoint(endpointText(api))
    } else if (action === "relatedPage") {
      const page = graph?.pages.find((p) => p.apiIds.includes(apiId))
      if (page) selectNode("page", page.id)
    }
  }

  if (graph.apis.length === 0) {
    return (
      <div style={EMPTY}>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_SECONDARY, margin: 0 }}>
          아직 등록된 API가 없어요. 채팅으로 화면을 만들면 API가 함께 생겨요.
        </p>
      </div>
    )
  }

  return (
    <div style={WRAP} className="api_catalog_wrap">
      <table style={TABLE}>
        <thead>
          <tr>
            {COLUMNS.map((c, i) => (
              <th key={c || `col-${i}`} style={TH}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {graph.apis.map((api) => (
            <FragmentRow
              key={api.id}
              isOpen={openId === api.id}
              detail={
                openId === api.id ? (
                  <ApiDetailPanel graph={graph} api={api} onClose={() => setOpenId(null)} />
                ) : null
              }
            >
              <ApiCatalogRow
                graph={graph}
                api={api}
                isOpen={openId === api.id}
                onToggle={() => setOpenId((prev) => (prev === api.id ? null : api.id))}
                onMenu={(action) => handleMenu(api.id, action)}
              />
            </FragmentRow>
          ))}
        </tbody>
      </table>

      <button type="button" onClick={() => addApi()} style={ADD_BTN} className="api_catalog_add">
        API 추가하기
      </button>
    </div>
  )
}

// 행 + (열렸을 때) 전체 너비 상세 행을 묶는다. <table> 안에서 상세를 colSpan 행으로 펼침.
const FragmentRow: FC<{ isOpen: boolean; detail: React.ReactNode; children: React.ReactNode }> = ({
  isOpen,
  detail,
  children,
}) => (
  <>
    {children}
    {isOpen && detail ? (
      <tr>
        <td colSpan={COLUMNS.length} style={DETAIL_CELL}>
          {detail}
        </td>
      </tr>
    ) : null}
  </>
)

const WRAP: CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: `${SPACING["8"]} ${SPACING["6"]}`,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
}

const TABLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "auto",
}

const TH: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  textAlign: "left",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_STRONG}`,
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  backgroundColor: COLOR.BG_SURFACE,
  zIndex: 1,
}

const DETAIL_CELL: CSSProperties = {
  padding: `0 ${SPACING["3"]} ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_BASE,
}

const ADD_BTN: CSSProperties = {
  alignSelf: "flex-start",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  border: "none",
  background: "transparent",
  color: COLOR.ACCENT,
  ...TYPOGRAPHY.STYLE.LABEL_1,
  cursor: "pointer",
}

const EMPTY: CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  padding: `${SPACING["10"]} ${SPACING["6"]}`,
  textAlign: "center",
}

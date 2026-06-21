"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import { useGraphStore } from "@/lib/store/graph"
import type { ProjectGraph, Api } from "@/lib/types/assembler"
import { COLOR, SPACING, TYPOGRAPHY, RADIUS } from "@/lib/design-tokens"
import {
  deriveApiName,
  endpointText,
  apiUsedInLabels,
  apiTriggerLabels,
  apiDatabaseLabels,
  errorChips,
} from "./api-catalog"
import { EndpointCopy } from "./EndpointCopy"
import { Chip } from "./Chip"

// API 상세 패널 (ASS-080) — 행 클릭 시 인라인 확장으로 열리는 비개발자용 상세.
// Request/Response data는 모델에 없어 "아직 정의되지 않았어요" 플레이스홀더 (후속: 모델 확장 시 채움).
export const ApiDetailPanel: FC<{ graph: ProjectGraph; api: Api; onClose: () => void }> = ({
  graph,
  api,
  onClose,
}) => {
  const selectNode = useGraphStore((s) => s.selectNode)

  const usedIn = apiUsedInLabels(graph, api.id)
  const triggers = apiTriggerLabels(graph, api.id)
  const dbLabels = apiDatabaseLabels(graph, api)
  const errors = errorChips(api.error)
  const relatedElements = graph.uiElements.filter((el) => el.apiIds.includes(api.id))
  const usedPageIds = graph.pages.filter((p) => p.apiIds.includes(api.id)).map((p) => p.id)

  return (
    <div style={PANEL} className="api_detail_area">
      <div style={HEADER}>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>{deriveApiName(api)}</p>
          {api.purpose.trim().length > 0 ? (
            <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["1"]} 0 0` }}>
              {api.purpose}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} aria-label="상세 닫기" style={CLOSE_BTN}>
          ✕
        </button>
      </div>

      <Field label="Endpoint">
        <EndpointCopy text={endpointText(api)} />
      </Field>

      <Field label="이 액션이 호출해요">
        {triggers.length > 0 ? (
          <div style={CHIP_ROW}>
            {triggers.map((t) => (
              <Chip key={t} label={t} />
            ))}
          </div>
        ) : (
          <Muted>아직 연결된 UI 액션이 없어요</Muted>
        )}
      </Field>

      <Field label="이 화면에서 써요">
        {usedIn.length > 0 ? (
          <div style={CHIP_ROW}>
            {usedIn.map((u) => (
              <Chip key={u} label={u} />
            ))}
          </div>
        ) : (
          <Muted>아직 연결된 화면이 없어요</Muted>
        )}
      </Field>

      <Field label="Request data">
        <Muted>아직 정의되지 않았어요</Muted>
      </Field>

      <Field label="Response data">
        <Muted>아직 정의되지 않았어요</Muted>
      </Field>

      <Field label="성공하면">
        {api.success.trim().length > 0 ? <Plain>{api.success}</Plain> : <Muted>아직 정의되지 않았어요</Muted>}
      </Field>

      <Field label="실패하면">
        {errors.length > 0 ? (
          <div style={CHIP_ROW}>
            {errors.map((e) => (
              <Chip key={e} label={e} tone="negative" />
            ))}
          </div>
        ) : (
          <Muted>아직 정의되지 않았어요</Muted>
        )}
      </Field>

      <Field label="관련 데이터베이스">
        {dbLabels.length > 0 ? (
          <div style={CHIP_ROW}>
            {dbLabels.map((d) => (
              <Chip key={d} label={d} mono />
            ))}
          </div>
        ) : (
          <Muted>연결된 테이블이 없어요</Muted>
        )}
      </Field>

      <Field label="관련 UI 요소">
        {relatedElements.length > 0 ? (
          <div style={CHIP_ROW}>
            {relatedElements.map((el) => (
              <Chip key={el.id} label={el.name} />
            ))}
          </div>
        ) : (
          <Muted>연결된 요소가 없어요</Muted>
        )}
      </Field>

      {usedPageIds.length > 0 ? (
        <button
          type="button"
          onClick={() => selectNode("page", usedPageIds[0])}
          style={GO_PAGE_BTN}
          className="api_detail_go_page"
        >
          관련 화면으로 가기
        </button>
      ) : null}
    </div>
  )
}

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={FIELD}>
    <p style={FIELD_LABEL}>{label}</p>
    {children}
  </div>
)

const Plain: FC<{ children: ReactNode }> = ({ children }) => (
  <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>{children}</p>
)

const Muted: FC<{ children: ReactNode }> = ({ children }) => (
  <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>{children}</p>
)

const PANEL: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  padding: SPACING["5"],
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
}

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: SPACING["3"],
}

const CLOSE_BTN: CSSProperties = {
  flexShrink: 0,
  width: "28px",
  height: "28px",
  borderRadius: RADIUS.SM,
  border: "none",
  background: "transparent",
  color: COLOR.TEXT_MUTED,
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
}

const FIELD: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["2"] }

const FIELD_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: 0 }

const CHIP_ROW: CSSProperties = { display: "flex", flexWrap: "wrap", gap: SPACING["2"] }

const GO_PAGE_BTN: CSSProperties = {
  alignSelf: "flex-start",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  background: COLOR.BG_SURFACE,
  color: COLOR.ACCENT,
  ...TYPOGRAPHY.STYLE.LABEL_1,
  cursor: "pointer",
}

"use client"

import { useState, type CSSProperties, type FC } from "react"
import type { ProjectGraph, Api } from "@/lib/types/assembler"
import { COLOR, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import {
  deriveApiName,
  endpointText,
  apiUsedInLabels,
  apiTriggerLabels,
  apiDatabaseLabels,
  errorChips,
} from "./api-catalog"
import { Chip } from "./Chip"
import { ApiRowMenu, type ApiMenuAction } from "./ApiRowMenu"

// 카탈로그 한 행 (ASS-080) — 9컬럼. 행 클릭 → 상세 토글. 비개발자가 좌→우로 스캔하도록 밀도 낮게.
export const ApiCatalogRow: FC<{
  graph: ProjectGraph
  api: Api
  isOpen: boolean
  onToggle: () => void
  onMenu: (action: ApiMenuAction) => void
}> = ({ graph, api, isOpen, onToggle, onMenu }) => {
  const [hovered, setHovered] = useState(false)

  const usedIn = apiUsedInLabels(graph, api.id)
  const triggers = apiTriggerLabels(graph, api.id)
  const dbLabels = apiDatabaseLabels(graph, api)
  const errors = errorChips(api.error)
  const hasRelatedPage = graph.pages.some((p) => p.apiIds.includes(api.id))

  return (
    <tr
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isOpen || hovered ? INTERACTION.HOVER_BG_SURFACE : "transparent",
        transition: INTERACTION.TRANSITION_BG,
        cursor: "pointer",
      }}
    >
      {/* 1. API — 이름(굵게) + purpose */}
      <td style={CELL}>
        <p style={NAME}>{deriveApiName(api)}</p>
        {api.purpose.trim().length > 0 ? <p style={SUB}>{api.purpose}</p> : null}
      </td>

      {/* 2. Endpoint — mono */}
      <td style={CELL}>
        <span style={MONO}>{endpointText(api)}</span>
      </td>

      {/* 3. Used in */}
      <td style={CELL}>{usedIn.length > 0 ? <ChipList items={usedIn} /> : <Dash />}</td>

      {/* 4. Trigger */}
      <td style={CELL}>{triggers.length > 0 ? <ChipList items={triggers} /> : <Dash />}</td>

      {/* 5. Success result */}
      <td style={CELL}>
        {api.success.trim().length > 0 ? <span style={PLAIN}>{api.success}</span> : <Dash />}
      </td>

      {/* 6. Error cases — muted chips */}
      <td style={CELL}>
        {errors.length > 0 ? (
          <div style={CHIP_WRAP}>
            {errors.map((e) => (
              <Chip key={e} label={e} tone="negative" />
            ))}
          </div>
        ) : (
          <Dash />
        )}
      </td>

      {/* 7. Database */}
      <td style={CELL}>
        {dbLabels.length > 0 ? (
          <div style={CHIP_WRAP}>
            {dbLabels.map((d) => (
              <Chip key={d} label={d} mono />
            ))}
          </div>
        ) : (
          <Dash />
        )}
      </td>

      {/* 8. Last updated — 모델에 타임스탬프 없음 (후속: Api에 updatedAt 추가 시 표시) */}
      <td style={CELL}>
        <Dash />
      </td>

      {/* 9. Actions — kebab */}
      <td style={{ ...CELL, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <ApiRowMenu onAction={onMenu} hasRelatedPage={hasRelatedPage} />
      </td>
    </tr>
  )
}

const ChipList: FC<{ items: string[] }> = ({ items }) => (
  <div style={CHIP_WRAP}>
    {items.map((it) => (
      <Chip key={it} label={it} />
    ))}
  </div>
)

const Dash: FC = () => <span style={{ color: COLOR.TEXT_MUTED }}>—</span>

const CELL: CSSProperties = {
  padding: `${SPACING["3"]} ${SPACING["3"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  verticalAlign: "top",
  textAlign: "left",
}

const NAME: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_1,
  fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
  color: COLOR.TEXT_PRIMARY,
  margin: 0,
}

const SUB: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  fontWeight: TYPOGRAPHY.WEIGHT.REGULAR,
  color: COLOR.TEXT_SECONDARY,
  margin: `${SPACING["1"]} 0 0`,
}

const MONO: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "13px",
  color: COLOR.TEXT_LABEL,
  whiteSpace: "nowrap",
}

const PLAIN: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_PRIMARY }

const CHIP_WRAP: CSSProperties = { display: "flex", flexWrap: "wrap", gap: SPACING["1"] }

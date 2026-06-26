"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import type { ProjectGraph, Requirement, RequirementStatus } from "@/lib/types/assembler"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 문서 3분할의 우측 상세 패널 (그림2-doc) — 표시ID·상태·중요도·역할·설명·수용기준.
// 헤더 액션(AI 요청·편집·삭제)은 제목 아래 행. 상태 pill·역할 칩. DS 토큰만.

const STATUS_COLOR: Record<RequirementStatus, string> = {
  대기: COLOR.TEXT_MUTED,
  진행중: COLOR.WARNING,
  완료: COLOR.POSITIVE,
}
const PRIORITY_LABEL: Record<string, string> = { high: "상", mid: "중", low: "하" }

export const RequirementDetail: FC<{ requirement: Requirement; graph: ProjectGraph }> = ({
  requirement,
  graph,
}) => {
  const status = requirement.status ?? "대기"
  const priority = requirement.priority ?? "mid"
  const criteria = requirement.acceptanceCriteria ?? []
  const featureCount = graph.features.filter((f) => f.requirementIds.includes(requirement.id)).length

  return (
    <div style={WRAP}>
      <header style={HEADER}>
        <h2 style={TITLE}>{requirement.title}</h2>
        <div style={ACTIONS}>
          <button type="button" style={AI_BTN} aria-label="AI에게 요청하기">AI에게 요청</button>
          <IconBtn label="이름 바꾸기"><PencilIcon /></IconBtn>
          <IconBtn label="삭제하기"><TrashIcon /></IconBtn>
        </div>
      </header>

      <dl style={META}>
        <Row label="ID"><span style={MONO}>{requirement.displayId ?? "—"}</span></Row>
        <Row label="상태">
          <span style={STATUS_PILL}>
            <span aria-hidden style={dot(STATUS_COLOR[status])} />
            <span style={{ color: STATUS_COLOR[status] }}>{status}</span>
          </span>
        </Row>
        <Row label="중요도"><span style={VALUE}>{PRIORITY_LABEL[priority] ?? priority}</span></Row>
        <Row label="역할">
          {requirement.role ? <span style={CHIP}>{requirement.role}</span> : <span style={VALUE}>—</span>}
        </Row>
      </dl>

      <p style={DESC}>{requirement.description}</p>

      <hr style={DIVIDER} />

      <section>
        <h3 style={SECTION_TITLE}>수용 기준</h3>
        {criteria.length > 0 ? (
          <ul style={LIST}>
            {criteria.map((c) => (
              <li key={c.id} style={CRITERION}>
                <span aria-hidden style={checkbox(c.done)}>{c.done ? "✓" : ""}</span>
                <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_PRIMARY }}>{c.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>아직 수용 기준이 없어요.</p>
        )}
      </section>

      <p style={FOOT}>연결된 기능 {featureCount}개</p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={ROW}>
      <dt style={ROW_LABEL}>{label}</dt>
      <dd style={ROW_VALUE}>{children}</dd>
    </div>
  )
}
function IconBtn({ label, children }: { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} style={ICON_BTN}>{children}</button>
}

const PencilIcon: FC = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.5 2.5l2 2L6 12l-2.5.5.5-2.5 7.5-7.5z" />
  </svg>
)
const TrashIcon: FC = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" />
  </svg>
)

const WRAP: CSSProperties = { display: "flex", flexDirection: "column", padding: SPACING["6"], height: "100%", overflowY: "auto" }
const HEADER: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["3"] }
const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, margin: 0, lineHeight: 1.35 }
const ACTIONS: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["1"] }
const AI_BTN: CSSProperties = {
  padding: `${SPACING["1"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  background: "transparent",
  color: COLOR.TEXT_SECONDARY,
  cursor: "pointer",
  ...TYPOGRAPHY.STYLE.LABEL_2,
}
const ICON_BTN: CSSProperties = {
  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: RADIUS.SM, border: "none", background: "transparent", color: COLOR.TEXT_MUTED, cursor: "pointer",
}
const META: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["3"], margin: `${SPACING["6"]} 0 0` }
const ROW: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["3"] }
const ROW_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, width: 56, flexShrink: 0, margin: 0 }
const ROW_VALUE: CSSProperties = { margin: 0, minWidth: 0 }
const VALUE: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }
const MONO: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, fontVariantNumeric: "tabular-nums" }
const STATUS_PILL: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.PILL, border: `1px solid ${COLOR.BORDER_DEFAULT}`, ...TYPOGRAPHY.STYLE.LABEL_2,
}
const CHIP: CSSProperties = {
  display: "inline-flex", alignItems: "center", padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.PILL, border: `1px solid ${COLOR.BORDER_DEFAULT}`, color: COLOR.TEXT_SECONDARY, ...TYPOGRAPHY.STYLE.LABEL_2,
}
const DESC: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, marginTop: SPACING["6"], lineHeight: 1.6, whiteSpace: "pre-wrap" }
const DIVIDER: CSSProperties = { border: "none", borderTop: `1px solid ${COLOR.BORDER_DEFAULT}`, margin: `${SPACING["6"]} 0` }
const SECTION_TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `0 0 ${SPACING["3"]}` }
const LIST: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: SPACING["2"] }
const CRITERION: CSSProperties = { display: "flex", alignItems: "flex-start", gap: SPACING["2"] }
const FOOT: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, marginTop: "auto", paddingTop: SPACING["6"] }

function dot(color: string): CSSProperties {
  return { width: 6, height: 6, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }
}
function checkbox(done: boolean): CSSProperties {
  return {
    width: 16, height: 16, flexShrink: 0, borderRadius: RADIUS.XS,
    border: `1px solid ${done ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
    backgroundColor: done ? COLOR.ACCENT : "transparent", color: COLOR.TEXT_INVERSE,
    fontSize: 11, lineHeight: "14px", textAlign: "center", marginTop: 1,
  }
}

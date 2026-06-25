"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import type { ProjectGraph, Requirement, RequirementStatus } from "@/lib/types/assembler"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 문서 3분할의 우측 상세 패널 (그림2-doc) — 선택 요구사항의 표시ID·상태·중요도·역할·설명·수용기준.
// 1차는 표시 중심(편집은 후속) — 목업 구조·정보 위계를 먼저 맞춘다.

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
        <button type="button" style={AI_BTN} aria-label="AI에게 요청하기">
          AI에게 요청
        </button>
      </header>

      <dl style={META}>
        <Row label="ID">
          <span style={MONO}>{requirement.displayId ?? "—"}</span>
        </Row>
        <Row label="상태">
          <span style={chip(STATUS_COLOR[status])}>● {status}</span>
        </Row>
        <Row label="중요도">
          <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }}>
            {PRIORITY_LABEL[priority] ?? priority}
          </span>
        </Row>
        <Row label="역할">
          <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }}>
            {requirement.role || "—"}
          </span>
        </Row>
      </dl>

      <p style={DESC}>{requirement.description}</p>

      <section style={{ marginTop: SPACING["6"] }}>
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
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>
            아직 수용 기준이 없어요.
          </p>
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

const WRAP: CSSProperties = { display: "flex", flexDirection: "column", padding: SPACING["6"], height: "100%", overflowY: "auto" }
const HEADER: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: SPACING["3"] }
const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, margin: 0 }
const AI_BTN: CSSProperties = {
  flexShrink: 0,
  padding: `${SPACING["1"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  background: "transparent",
  color: COLOR.TEXT_SECONDARY,
  cursor: "pointer",
  ...TYPOGRAPHY.STYLE.LABEL_2,
}
const META: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["2"], margin: `${SPACING["5"]} 0 0` }
const ROW: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["3"] }
const ROW_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, width: 64, flexShrink: 0, margin: 0 }
const ROW_VALUE: CSSProperties = { margin: 0 }
const MONO: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, fontVariantNumeric: "tabular-nums" }
const DESC: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, marginTop: SPACING["5"], whiteSpace: "pre-wrap" }
const SECTION_TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `0 0 ${SPACING["3"]}` }
const LIST: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: SPACING["2"] }
const CRITERION: CSSProperties = { display: "flex", alignItems: "flex-start", gap: SPACING["2"] }
const FOOT: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, marginTop: "auto", paddingTop: SPACING["6"] }

function chip(color: string): CSSProperties {
  return { ...TYPOGRAPHY.STYLE.LABEL_2, color, display: "inline-flex", alignItems: "center", gap: 4 }
}
function checkbox(done: boolean): CSSProperties {
  return {
    width: 16,
    height: 16,
    flexShrink: 0,
    borderRadius: RADIUS.XS,
    border: `1px solid ${done ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
    backgroundColor: done ? COLOR.ACCENT : "transparent",
    color: COLOR.TEXT_INVERSE,
    fontSize: 11,
    lineHeight: "14px",
    textAlign: "center",
    marginTop: 1,
  }
}

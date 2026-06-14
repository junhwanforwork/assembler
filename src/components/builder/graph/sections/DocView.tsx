"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// 문서(PRD) 섹션 — 그래프를 구조화 문서로 렌더. 인라인 편집은 ASS-029/030/031.
export const DocView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null

  return (
    <div style={PAGE_STYLE}>
      <h1 style={{ ...TYPOGRAPHY.STYLE.H2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>{graph.name}</h1>
      <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_SECONDARY, marginTop: SPACING["2"] }}>
        {graph.description || "한 줄 설명이 아직 없어요."}
      </p>

      <Section title={`요구사항 (${graph.requirements.length})`}>
        {graph.requirements.length === 0 ? (
          <Empty>아직 요구사항이 없어요. 대화로 만들어 보세요.</Empty>
        ) : (
          graph.requirements.map((r) => (
            <Card key={r.id} title={r.title} body={r.description} />
          ))
        )}
      </Section>

      <Section title={`기능 (${graph.features.length})`}>
        {graph.features.length === 0 ? (
          <Empty>아직 기능이 없어요.</Empty>
        ) : (
          graph.features.map((f) => (
            <Card
              key={f.id}
              title={f.name}
              body={f.description}
              rules={f.businessRules}
            />
          ))
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: SPACING["8"] }}>
      <h2 style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, margin: 0, marginBottom: SPACING["3"] }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>{children}</div>
    </section>
  )
}

function Card({ title, body, rules }: { title: string; body: string; rules?: string[] }) {
  return (
    <div style={CARD_STYLE}>
      <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
        {title}
      </p>
      {body ? (
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["1"]} 0 0` }}>{body}</p>
      ) : null}
      {rules && rules.length > 0 ? (
        <ul style={{ margin: `${SPACING["2"]} 0 0`, paddingLeft: "18px" }}>
          {rules.map((rule, i) => (
            <li key={i} style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>{rule}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>{children}</p>
}

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  padding: `${SPACING["8"]} ${SPACING["6"]}`,
}

const CARD_STYLE: React.CSSProperties = {
  padding: SPACING["4"],
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
}

"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { CommittingTextInput, CommittingTextArea } from "@/components/builder/inspector/CommittingField"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { RequirementList } from "./doc/RequirementList"
import { FeatureList } from "./doc/FeatureList"

// 문서(PRD) 섹션 — Overview/Requirements/Features 구조화 문서 + 인라인 편집 (ASS-029/030/031).
export const DocView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const updateMeta = useGraphStore((s) => s.updateMeta)
  if (!graph) return null

  return (
    <div style={PAGE_STYLE}>
      <CommittingTextInput
        key={graph.id}
        value={graph.name}
        onCommit={(v) => updateMeta({ name: v })}
        placeholder="프로젝트 이름"
        ariaLabel="프로젝트 이름"
      />
      <CommittingTextArea
        key={`${graph.id}-desc`}
        value={graph.description}
        onCommit={(v) => updateMeta({ description: v })}
        placeholder="이 프로젝트를 한 줄로 설명해 주세요"
        rows={2}
      />

      <Section title={`요구사항 (${graph.requirements.length})`}>
        <RequirementList />
      </Section>

      <Section title={`기능 (${graph.features.length})`}>
        <FeatureList />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: SPACING["8"] }}>
      <h2 style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, margin: `0 0 ${SPACING["3"]}` }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

const PAGE_STYLE: CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  padding: `${SPACING["8"]} ${SPACING["6"]}`,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
}

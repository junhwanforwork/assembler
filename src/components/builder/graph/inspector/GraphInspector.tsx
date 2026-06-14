"use client"

import { type CSSProperties, type FC } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { CommittingTextInput, CommittingTextArea } from "@/components/builder/inspector/CommittingField"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { Field, RefSelector, ResultField, StatesField } from "./fields"

// 요소 매핑 편집 패널 (ASS-035) — Layers에서 드릴인, ← 뒤로로 복귀. states·action·API·DB·result.
export const GraphInspector: FC<{ graph: ProjectGraph }> = ({ graph }) => {
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectElement = useGraphStore((s) => s.selectElement)
  const updateUIElement = useGraphStore((s) => s.updateUIElement)
  const addApiToElement = useGraphStore((s) => s.addApiToElement)
  const removeApiFromElement = useGraphStore((s) => s.removeApiFromElement)
  const addDatabaseToElement = useGraphStore((s) => s.addDatabaseToElement)
  const removeDatabaseFromElement = useGraphStore((s) => s.removeDatabaseFromElement)

  const element = graph.uiElements.find((el) => el.id === selectedElementId)
  if (!element) return null

  return (
    <div style={WRAP}>
      <button type="button" onClick={() => selectElement(null)} style={BACK}>
        ← 뒤로
      </button>
      <span style={TYPE_BADGE}>{element.type}</span>

      <div style={{ marginTop: SPACING["2"], display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
        <CommittingTextInput
          key={`${element.id}-name`}
          value={element.name}
          onCommit={(v) => updateUIElement(element.id, { name: v })}
          placeholder="요소 이름"
          size="sm"
          ariaLabel="요소 이름"
        />
        <CommittingTextArea
          key={`${element.id}-desc`}
          value={element.description}
          onCommit={(v) => updateUIElement(element.id, { description: v })}
          placeholder="이 요소의 비즈니스 의미"
          rows={2}
        />
      </div>

      <Field label="동작 (Action)">
        <CommittingTextInput
          key={`${element.id}-action`}
          value={element.action}
          onCommit={(v) => updateUIElement(element.id, { action: v })}
          placeholder="예: Click"
          size="sm"
          ariaLabel="동작"
        />
      </Field>

      <StatesField element={element} />

      <RefSelector
        label="API"
        options={graph.apis.map((a) => ({ id: a.id, label: `${a.method} ${a.path}` }))}
        selectedIds={element.apiIds}
        onToggle={(id, on) => (on ? addApiToElement(element.id, id) : removeApiFromElement(element.id, id))}
        emptyText="API가 없어요. API·데이터 섹션에서 추가해 보세요."
      />
      <RefSelector
        label="Database"
        options={graph.databases.map((d) => ({ id: d.id, label: d.name }))}
        selectedIds={element.databaseIds}
        onToggle={(id, on) =>
          on ? addDatabaseToElement(element.id, id) : removeDatabaseFromElement(element.id, id)
        }
        emptyText="테이블이 없어요. API·데이터 섹션에서 추가해 보세요."
      />

      <ResultField element={element} graph={graph} />
    </div>
  )
}

const WRAP: CSSProperties = { display: "flex", flexDirection: "column" }
const BACK: CSSProperties = {
  alignSelf: "flex-start",
  border: "none",
  background: "transparent",
  color: COLOR.TEXT_SECONDARY,
  cursor: "pointer",
  padding: `${SPACING["1"]} 0`,
  marginBottom: SPACING["2"],
  ...TYPOGRAPHY.STYLE.LABEL_2,
}
const TYPE_BADGE: CSSProperties = {
  alignSelf: "flex-start",
  padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.PILL,
  backgroundColor: COLOR.BG_SECTION,
  color: COLOR.TEXT_MUTED,
  ...TYPOGRAPHY.STYLE.LABEL_2,
}

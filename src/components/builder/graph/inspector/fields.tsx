"use client"

import { useState, type CSSProperties, type FC, type ReactNode } from "react"
import type { ProjectGraph, UIElement, UIElementResult, UIElementState } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { Button, Dropdown, DropdownTrigger, DropdownItem } from "@/components/ui"
import { CommittingTextInput } from "@/components/builder/inspector/CommittingField"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { InlineDeleteButton } from "../shared/InlineDeleteButton"

const RESULT_KINDS: { kind: UIElementResult["kind"]; label: string }[] = [
  { kind: "navigate", label: "이동" },
  { kind: "stateChange", label: "상태 변화" },
  { kind: "toast", label: "토스트" },
  { kind: "inlineError", label: "인라인 에러" },
  { kind: "none", label: "없음" },
]

const detailOf = (r: UIElementResult): string => ("detail" in r ? r.detail ?? "" : "")

// kind 전환 시 해당 종류의 기본 result 생성(이전 detail/toPageId 보존). navigate는 첫 페이지로 기본.
function buildResult(kind: UIElementResult["kind"], prev: UIElementResult, graph: ProjectGraph): UIElementResult {
  switch (kind) {
    case "navigate":
      return { kind: "navigate", toPageId: prev.kind === "navigate" ? prev.toPageId : graph.pages[0]?.id ?? "" }
    case "none":
      return { kind: "none" }
    case "stateChange":
      return { kind: "stateChange", detail: detailOf(prev) }
    case "toast":
      return { kind: "toast", detail: detailOf(prev) }
    case "inlineError":
      return { kind: "inlineError", detail: detailOf(prev) }
  }
}

export const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={FIELD}>
    <span style={FIELD_LABEL}>{label}</span>
    {children}
  </div>
)

// API·DB N:N 토글 목록 (ASS-023 add/remove 액션 소비).
export const RefSelector: FC<{
  label: string
  options: { id: string; label: string }[]
  selectedIds: string[]
  onToggle: (id: string, on: boolean) => void
  emptyText: string
}> = ({ label, options, selectedIds, onToggle, emptyText }) => (
  <Field label={label}>
    {options.length === 0 ? (
      <p style={MUTED}>{emptyText}</p>
    ) : (
      options.map((o) => {
        const on = selectedIds.includes(o.id)
        return (
          <button key={o.id} type="button" onClick={() => onToggle(o.id, !on)} style={CHECK_ROW}>
            <span style={{ ...CHECK_BOX, ...(on ? CHECK_ON : null) }}>{on ? "✓" : ""}</span>
            <span style={CHECK_LABEL}>{o.label}</span>
          </button>
        )
      })
    )}
  </Field>
)

// Result — kind 선택 + navigate면 대상 페이지, 그 외는 detail. setUIElementResult가 edge 자동 동기(ASS-023).
export const ResultField: FC<{ element: UIElement; graph: ProjectGraph }> = ({ element, graph }) => {
  const setResult = useGraphStore((s) => s.setUIElementResult)
  const [openKind, setOpenKind] = useState(false)
  const [openPage, setOpenPage] = useState(false)
  const result = element.result

  // kind는 커밋 시점의 store 값으로 읽는다 — 편집 중 kind 전환 시 언마운트 flush가 옛 kind로 되돌리는 것 방지.
  const setDetail = (v: string) => {
    const cur = useGraphStore.getState().graph?.uiElements.find((e) => e.id === element.id)?.result
    if (cur?.kind === "stateChange") setResult(element.id, { kind: "stateChange", detail: v })
    else if (cur?.kind === "toast") setResult(element.id, { kind: "toast", detail: v })
    else if (cur?.kind === "inlineError") setResult(element.id, { kind: "inlineError", detail: v })
  }

  const kindLabel = RESULT_KINDS.find((k) => k.kind === result.kind)?.label ?? "없음"
  const targetName = result.kind === "navigate" ? graph.pages.find((p) => p.id === result.toPageId)?.name : undefined

  return (
    <Field label="결과 (Result)">
      <Dropdown
        open={openKind}
        onOpenChange={setOpenKind}
        trigger={<DropdownTrigger label={kindLabel} open={openKind} variant="text" />}
      >
        {RESULT_KINDS.map((k) => (
          <DropdownItem
            key={k.kind}
            label={k.label}
            selected={k.kind === result.kind}
            onClick={() => {
              setOpenKind(false)
              setResult(element.id, buildResult(k.kind, result, graph))
            }}
          />
        ))}
      </Dropdown>

      {result.kind === "navigate" ? (
        <Dropdown
          open={openPage}
          onOpenChange={setOpenPage}
          trigger={<DropdownTrigger label={targetName ?? "대상 페이지 선택"} open={openPage} variant="text" />}
        >
          {graph.pages.map((p) => (
            <DropdownItem
              key={p.id}
              label={p.name}
              selected={p.id === result.toPageId}
              onClick={() => {
                setOpenPage(false)
                setResult(element.id, { kind: "navigate", toPageId: p.id })
              }}
            />
          ))}
        </Dropdown>
      ) : result.kind !== "none" ? (
        <CommittingTextInput
          key={`${element.id}-${result.kind}`}
          value={detailOf(result)}
          onCommit={setDetail}
          placeholder="결과 설명"
          size="sm"
          ariaLabel="결과 설명"
        />
      ) : null}
    </Field>
  )
}

// States 편집 — label 행 + 추가/삭제. (index key: 상태에 안정 id 없음 — StringListEditor와 동일 caveat.)
export const StatesField: FC<{ element: UIElement }> = ({ element }) => {
  const update = useGraphStore((s) => s.updateUIElement)
  const states = element.states
  const setStates = (next: UIElementState[]) => update(element.id, { states: next })

  return (
    <Field label="States">
      {states.map((st, i) => (
        <div key={i} style={STATE_ROW}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CommittingTextInput
              key={`${element.id}-state-${i}`}
              value={st.label}
              onCommit={(v) => setStates(states.map((s, idx) => (idx === i ? { ...s, label: v } : s)))}
              placeholder="상태명 (예: Loading)"
              size="sm"
              ariaLabel="상태명"
            />
          </div>
          <InlineDeleteButton label={`상태 ${i + 1} 삭제`} onClick={() => setStates(states.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setStates([...states, { label: "" }])}>
        상태 추가하기
      </Button>
    </Field>
  )
}

const FIELD: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["1"], marginTop: SPACING["4"] }
const FIELD_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_LABEL }
const MUTED: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: 0 }
const STATE_ROW: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["1"] }
const CHECK_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  width: "100%",
  padding: `${SPACING["1"]} ${SPACING["1"]}`,
  border: "none",
  borderRadius: RADIUS.SM,
  background: "transparent",
  cursor: "pointer",
}
const CHECK_BOX: CSSProperties = {
  width: 16,
  height: 16,
  flexShrink: 0,
  borderRadius: RADIUS.XS,
  border: `1px solid ${COLOR.BORDER_STRONG}`,
  color: COLOR.TEXT_INVERSE,
  fontSize: "11px",
  lineHeight: "14px",
  textAlign: "center",
}
const CHECK_ON: CSSProperties = { backgroundColor: COLOR.ACCENT, borderColor: COLOR.ACCENT }
const CHECK_LABEL: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_SECONDARY,
  flex: 1,
  minWidth: 0,
  textAlign: "left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

"use client"

import { useMemo } from "react"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { EMPTY_SPEC_FILTERS, useEditorStore } from "@/lib/stores/useEditorStore"
import { buildFeatureNamesByReq, filterRequirements } from "../views/specFilter"
import type { SuggestionJump } from "../suggestionsTarget"
import { buildImpactRows, type ImpactChip } from "./planImpact"
import s from "../editor.module.css"

// 변경 계획의 "영향 범위"(ASM-029) — op별 직접 대상에서 역참조 전파(impact.ts)가 닿는 객체를 칩으로.
// 전이 영향이 하나도 없으면 섹션 자체를 그리지 않는다(빈 껍데기 금지).

export function ImpactSection({ ops, design }: { ops: ChangeOp[]; design: WorkspaceDesign }) {
  const rows = useMemo(() => buildImpactRows(ops, design), [ops, design])
  if (rows.length === 0) return null

  return (
    <div className={s.planImpact}>
      <div className={s.planImpactHead}>
        <span className={s.planImpactTitle}>영향 범위</span>
        <span className={s.planImpactNote}>적용하면 연결된 이 객체들까지 영향이 닿아요.</span>
      </div>
      {rows.map((row) => (
        <div key={row.opId} className={s.planImpactRow}>
          <ImpactChipView chip={row.target} design={design} />
          <span className={s.planImpactArrow} aria-hidden>
            →
          </span>
          {row.impacts.map((chip) => (
            <ImpactChipView key={`${row.opId}-${chip.kindLabel}-${chip.id}`} chip={chip} design={design} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ImpactChipView({ chip, design }: { chip: ImpactChip; design: WorkspaceDesign }) {
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const specFilters = useEditorStore((st) => st.specFilters)
  const setSpecFilters = useEditorStore((st) => st.setSpecFilters)

  const jumpTarget = chip.jump
  if (!jumpTarget) {
    // 명세 선택이 비출 수 없는 타입(페이지·플로우·와이어프레임·요소) — 이름만 보여준다(suggestionsTarget 규칙).
    return (
      <span className={s.impactChipStatic}>
        <b>{chip.kindLabel}</b>
        {chip.name}
      </span>
    )
  }

  // #39 점프 가드 — 타깃 요구사항이 필터에 걸러져 있으면 필터를 풀고 이동한다(SuggestionsCard와 동일 규칙).
  const jump = (target: SuggestionJump) => {
    const visible = filterRequirements(design.requirements, buildFeatureNamesByReq(design.features), specFilters)
    if (!visible.some((r) => r.id === target.reqId)) setSpecFilters(EMPTY_SPEC_FILTERS)
    selectSpecReq(target.reqId)
    if (target.kind === "feature") selectSpecFeature(target.featureId)
    setActiveView("spec")
  }

  return (
    <button type="button" className={s.impactChip} onClick={() => jump(jumpTarget)}>
      <b>{chip.kindLabel}</b>
      {chip.name}
    </button>
  )
}

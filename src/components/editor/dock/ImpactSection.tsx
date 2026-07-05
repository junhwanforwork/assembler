"use client"

import { useMemo } from "react"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { useSpecJump } from "../useSpecJump"
import { buildImpactRows, type ImpactChip } from "./planImpact"
import s from "../editor.module.css"

// 변경 계획의 "영향 범위"(ASM-029) — op별 직접 대상에서 역참조 전파(impact.ts)가 닿는 객체를 칩으로.
// 전이 영향이 하나도 없으면 섹션 자체를 그리지 않는다(빈 껍데기 금지).

export function ImpactSection({
  ops,
  design,
  applying = false,
}: {
  ops: ChangeOp[]
  design: WorkspaceDesign
  // 적용 중엔 점프 차단 — 저장 도중 뷰·선택이 바뀌면 결과 확인 맥락이 끊긴다.
  applying?: boolean
}) {
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
          <ImpactChipView chip={row.target} design={design} disabled={applying} />
          <span className={s.planImpactArrow} aria-hidden>
            →
          </span>
          {row.impacts.map((chip) => (
            <ImpactChipView
              key={`${row.opId}-${chip.kindLabel}-${chip.id}`}
              chip={chip}
              design={design}
              disabled={applying}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ImpactChipView({ chip, design, disabled }: { chip: ImpactChip; design: WorkspaceDesign; disabled: boolean }) {
  // #39 점프 가드 — SuggestionsCard·FeaturePanel과 같은 규칙(useSpecJump 단일 출처).
  const jump = useSpecJump(design)

  const jumpTarget = chip.jump
  if (!jumpTarget) {
    // 명세 선택이 비출 수 없는 타입(페이지·플로우·와이어프레임·요소) — 이름만 보여준다(suggestionsTarget 규칙).
    return (
      <span className={s.impactChipStatic} title={chip.name}>
        <b>{chip.kindLabel}</b>
        <span className={s.impactChipName}>{chip.name}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={s.impactChip}
      title={chip.name}
      disabled={disabled}
      onClick={() => jump(jumpTarget)}
    >
      <b>{chip.kindLabel}</b>
      <span className={s.impactChipName}>{chip.name}</span>
    </button>
  )
}

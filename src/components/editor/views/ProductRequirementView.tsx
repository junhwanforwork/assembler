"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { useSpecJump } from "../useSpecJump"
import { projectDoc, type DocFeatureBlock, type DocSection } from "./docProjection"
import { PriorityBars, RequirementStatusPill } from "./Badges"
import shell from "../editor.module.css"
import s from "./ProductRequirementView.module.css"

// Product Requirement 리스트(SW2) — Storyboard의 요구사항 리스트(=PRD). 전체 요구사항 + 소속 기능을
// "어떤 요구사항을 위해 → 이런 기능들을" 로 이해시킨다. 저장 0, docProjection 재사용(단일 출처).
// 읽기 위주(직접 편집은 SW3). 기능 클릭 = 기능 명세서로 점프(useSpecJump 단일 출처, 필터 가드 공유).
export function ProductRequirementView({ design }: { design: WorkspaceDesign }) {
  const doc = useMemo(() => projectDoc(design), [design])
  const jump = useSpecJump(design)
  const preqSelectedId = useEditorStore((st) => st.preqSelectedId)
  const selectPreq = useEditorStore((st) => st.selectPreq)

  return (
    <section className={shell.view}>
      <div className={shell.viewHead}>
        <span className={shell.viewTitle}>Product Requirement</span>
        <span className={clsx(shell.sec, s.headHint)}>요구사항마다 어떤 기능이 붙는지 보여드려요</span>
      </div>

      {doc.sections.length === 0 ? (
        <div className={shell.emptyCol} style={{ flex: 1 }}>
          아직 요구사항이 없어요. Composer로 만들어 보세요.
        </div>
      ) : (
        <div className={s.list}>
          {doc.sections.map((section) => (
            <RequirementRow
              key={section.requirement.id}
              section={section}
              isSelected={preqSelectedId === section.requirement.id}
              onSelect={() => selectPreq(section.requirement.id)}
              onFeatureJump={(featureId) => jump({ kind: "feature", reqId: section.requirement.id, featureId })}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function RequirementRow({
  section,
  isSelected,
  onSelect,
  onFeatureJump,
}: {
  section: DocSection
  isSelected: boolean
  onSelect: () => void
  onFeatureJump: (featureId: string) => void
}) {
  const r = section.requirement
  return (
    <article className={clsx(s.card, isSelected && s.cardActive)}>
      <div className={s.reqHead}>
        <h2 className={s.reqTitle}>
          <button type="button" className={s.reqTitleBtn} aria-current={isSelected || undefined} onClick={onSelect}>
            {r.title}
          </button>
        </h2>
        <span className={s.reqMeta}>
          <RequirementStatusPill status={r.status} />
          <PriorityBars priority={r.priority} />
          {r.role && <span className={s.reqRole}>{r.role}</span>}
        </span>
      </div>

      {r.description && <p className={s.reqDesc}>{r.description}</p>}

      <div className={s.features}>
        <div className={s.featuresLabel}>이 요구사항을 위한 기능</div>
        {section.features.length > 0 ? (
          section.features.map((f) => (
            <FeatureRow key={f.id} feature={f} onClick={() => onFeatureJump(f.id)} />
          ))
        ) : (
          <p className={s.featuresEmpty}>아직 연결된 기능이 없어요. 기능 명세서에서 이어 붙일 수 있어요.</p>
        )}
      </div>
    </article>
  )
}

// 기능 = 명세서로 점프하는 버튼(Chip 아닌 카드 — 이름·설명·세부 기능 수를 함께 보여 이해를 돕는다).
function FeatureRow({ feature, onClick }: { feature: DocFeatureBlock; onClick: () => void }) {
  return (
    <button type="button" className={s.feature} onClick={onClick}>
      <span className={s.featureName}>{feature.name}</span>
      {feature.description && <span className={s.featureDesc}>{feature.description}</span>}
      {feature.detailFeatures.length > 0 && (
        <span className={s.featureCount}>세부 기능 {feature.detailFeatures.length}개</span>
      )}
    </button>
  )
}

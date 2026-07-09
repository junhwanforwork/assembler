"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement } from "@/lib/types/assembler"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge } from "@/components/ui/Badge"
import { ChangeStatusPill, ImplStatusPill } from "./Badges"
import { countOrDash } from "./specViewFormat"
import c from "./SpecCardView.module.css"

// 명세 Card 뷰(SW2) — 디렉토리와 같은 공유 계약을 받아 선택 요구사항의 기능을 카드 그리드로 렌더한다.
// 읽기 전용. 카드 클릭 = selectSpecFeature(store). 전용 카드(InsightCard 아님) — 토큰만.
type SharedSpecProps = {
  requirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedFeature: Feature | null
  selectedDetail: DetailFeature | null
  unlinkedReqIds: Set<string>
  onAddRequirement: (title: string) => Promise<DesignPatchFailure | null>
}

export function SpecCardView({ features, selectedFeature }: SharedSpecProps) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  if (features.length === 0) {
    return <div className={c.empty}>연결된 기능이 없어요. 왼쪽에서 요구사항을 골라보세요.</div>
  }

  return (
    <div className={c.scroll}>
      <div className={c.grid}>
        {features.map((f) => {
          const isSel = f.id === selectedFeature?.id
          const pageCount = countOrDash(f.pageIds)
          const apiCount = countOrDash(f.apiIds)
          const dbCount = countOrDash(f.dbTableIds)
          return (
            <button
              key={f.id}
              className={clsx(c.card, isSel && c.cardSel)}
              aria-current={isSel || undefined}
              onClick={() => selectSpecFeature(f.id)}
            >
              <div className={c.cardName}>{f.name}</div>
              <div className={c.cardDesc}>{f.description || "설명이 아직 없어요"}</div>
              <div className={c.cardStatus}>
                {f.implStatus && <ImplStatusPill status={f.implStatus} />}
                {f.changeStatus && <ChangeStatusPill status={f.changeStatus} />}
              </div>
              <div className={c.cardMeta}>
                <span className={c.metaItem}>페이지 {pageCount}</span>
                <Badge variant="tag" tone="neutral">
                  API {apiCount}
                </Badge>
                <Badge variant="tag" tone="neutral">
                  DB {dbCount}
                </Badge>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

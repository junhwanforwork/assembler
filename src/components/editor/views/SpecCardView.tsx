"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge } from "@/components/ui/Badge"
import { ChangeStatusPill, ImplStatusPill } from "./Badges"
import { countOrDash } from "./specViewFormat"
import { SpecItemMenu } from "../SpecItemMenu"
import m from "../SpecItemMenu.module.css"
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
  // 아이템 3dot 메뉴(ASM-081)의 유료 제안 호출·점프 해석용.
  workspaceId: string
  design: WorkspaceDesign
}

export function SpecCardView({ features, selectedFeature, workspaceId, design }: SharedSpecProps) {
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
            // relative 래퍼 + 우상단 오버레이 — 카드 버튼 안에 버튼(3dot) 중첩을 피한다.
            <div key={f.id} className={m.rowRel}>
              <button
                className={clsx(c.card, m.flexBtn, isSel && c.cardSel)}
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
              <SpecItemMenu
                workspaceId={workspaceId}
                design={design}
                kind="feature"
                className={m.overCard}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

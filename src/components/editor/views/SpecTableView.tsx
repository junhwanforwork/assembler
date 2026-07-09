"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement } from "@/lib/types/assembler"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { ChangeStatusPill, ImplStatusPill, ReviewBadges } from "./Badges"
import { countOrDash } from "./specViewFormat"
import t from "./SpecTableView.module.css"

// 명세 Table 뷰(SW2) — 디렉토리와 같은 공유 계약을 받아 선택 요구사항의 기능을 표로 렌더한다.
// 읽기 전용(직접 편집은 SW3). 행 클릭 = selectSpecFeature(store) — 디렉토리·트리와 같은 선택 공유.
type SharedSpecProps = {
  requirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedFeature: Feature | null
  selectedDetail: DetailFeature | null
  unlinkedReqIds: Set<string>
  onAddRequirement: (title: string) => Promise<DesignPatchFailure | null>
}

const REVIEW_ROLES = ["planner", "designer", "developer"] as const
function hasAnyReview(feature: Feature): boolean {
  return REVIEW_ROLES.some((role) => !!feature.reviews?.[role])
}

export function SpecTableView({ features, selectedFeature }: SharedSpecProps) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  if (features.length === 0) {
    return <div className={t.empty}>연결된 기능이 없어요. 왼쪽에서 요구사항을 골라보세요.</div>
  }

  return (
    <div className={t.scroll}>
      <table className={t.table}>
        <thead>
          <tr>
            <th scope="col" className={t.thName}>기능명</th>
            <th scope="col" className={t.thDesc}>설명</th>
            <th scope="col" className={t.thNum}>적용 페이지</th>
            <th scope="col" className={t.thNum}>API</th>
            <th scope="col" className={t.thNum}>DB</th>
            <th scope="col">구현 여부</th>
            <th scope="col">변경 여부</th>
            <th scope="col">역할별 확인</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => {
            const isSel = f.id === selectedFeature?.id
            return (
              <tr key={f.id} className={clsx(t.row, isSel && t.rowSel)}>
                <td className={t.tdName}>
                  <button className={t.nameBtn} aria-current={isSel || undefined} onClick={() => selectSpecFeature(f.id)}>
                    {f.name}
                  </button>
                </td>
                <td className={t.tdDesc}>{f.description || <span className={t.dash}>—</span>}</td>
                <td className={t.tdNum}>{countOrDash(f.pageIds)}</td>
                <td className={t.tdNum}>{countOrDash(f.apiIds)}</td>
                <td className={t.tdNum}>{countOrDash(f.dbTableIds)}</td>
                <td>{f.implStatus ? <ImplStatusPill status={f.implStatus} /> : <span className={t.dash}>—</span>}</td>
                <td>{f.changeStatus ? <ChangeStatusPill status={f.changeStatus} /> : <span className={t.dash}>—</span>}</td>
                <td>
                  {hasAnyReview(f) ? (
                    <ReviewBadges reviews={f.reviews} className={t.reviews} />
                  ) : (
                    <span className={t.dash}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

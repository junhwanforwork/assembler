"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement } from "@/lib/types/assembler"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge } from "@/components/ui/Badge"
import { IconButton } from "@/components/ui/Button"
import { PlusIcon } from "@/components/ui/icons"
import { InlineAddInput, useInlineAdd } from "../InlineAddInput"
import { PatchErrorNote } from "../PatchErrorNote"
import s from "../editor.module.css"

// 디렉토리(밀러 2컬럼) — 요구사항 → 기능/상세 기능. 선택은 store 공유(#41).
// 선택 상세는 공용 인스펙터(우패널)가 보여준다 — ASM-017에서 3번째 컬럼 이주(A-11 상세 단일 집).
// 체크박스(#32)는 벌크바(#34)가 생기며 재노출 — 행 선택(inspected)과 독립인 벌크 선택.
export function SpecDirectoryView({
  requirements,
  features,
  selectedReq,
  selectedFeature,
  selectedDetail,
  unlinkedReqIds,
  onAddRequirement,
}: {
  requirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedFeature: Feature | null
  selectedDetail: DetailFeature | null
  // 연결된 기능이 하나도 없는 요구사항(#30 '연결 안 됨' 표시) — orphan 후속 감지는 suggestions 몫.
  unlinkedReqIds: Set<string>
  // 성공이면 null — 저장·선택·필터 해제 오케스트레이션은 SpecView 소유.
  onAddRequirement: (title: string) => Promise<DesignPatchFailure | null>
}) {
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const selectSpecDetail = useEditorStore((st) => st.selectSpecDetail)
  const specCheckedIds = useEditorStore((st) => st.specCheckedIds)
  const toggleSpecCheck = useEditorStore((st) => st.toggleSpecCheck)

  const add = useInlineAdd(onAddRequirement)

  return (
    <div className={s.miller}>
      {/* 요구사항 */}
      <div className={s.mcol}>
        <div className={s.mcolHead}>
          요구사항
          {/* #30 — 새 요구사항 인라인 추가. 빈 제목이면 취소. */}
          <IconButton label="요구사항 추가" onClick={add.open} disabled={add.adding}>
            <PlusIcon size={14} />
          </IconButton>
        </div>
        <div className={s.mlist}>
          {requirements.length === 0 && !add.adding && (
            <div className={s.emptyCol}>조건에 맞는 요구사항이 없어요. 필터를 풀거나 검색어를 바꿔보세요.</div>
          )}
          {requirements.map((r, i) => {
            const isSel = r.id === selectedReq?.id
            return (
              <div key={r.id} className={clsx(s.mrow, isSel && s.mrowSel)}>
                <input
                  type="checkbox"
                  aria-label={`${r.title} 선택`}
                  checked={specCheckedIds.includes(r.id)}
                  onChange={() => toggleSpecCheck(r.id)}
                />
                <button className={s.mrowAction} aria-current={isSel || undefined} onClick={() => selectSpecReq(r.id)}>
                  <span className={s.idx}>{i + 1}</span>
                  {r.title}
                  {unlinkedReqIds.has(r.id) && (
                    <Badge tone="warning" className={s.mrowFlag}>
                      연결 안 됨
                    </Badge>
                  )}
                  <span className={r.priority === "high" ? s.starOn : s.star}>
                    {r.priority === "high" ? "★" : "☆"}
                  </span>
                </button>
              </div>
            )
          })}
          {add.adding && (
            <>
              <div className={clsx(s.mrow, s.mrowSel)}>
                <span className={s.idx}>{requirements.length + 1}</span>
                <InlineAddInput
                  placeholder="요구사항 제목을 입력해 주세요"
                  ariaLabel="새 요구사항 제목"
                  saving={add.saving}
                  hasError={!!add.failure}
                  onCommit={add.commit}
                  onCancel={add.cancel}
                />
              </div>
              {add.failure && (
                <div className={s.inlineAddNote}>
                  <PatchErrorNote
                    failure={add.failure}
                    staleText="지금 스펙에 추가할 수 없어요. 잠시 후 다시 시도해 주세요."
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 기능 / 상세 기능 — 선택한 기능은 상세 기능 행을 펼친다(#35) */}
      <div className={clsx(s.mcol, s.mcolLast)}>
        <div className={s.mcolHead}>기능 / 상세 기능</div>
        <div className={s.mlist}>
          {features.length === 0 && <div className={s.emptyCol}>연결된 기능이 없어요.</div>}
          {features.map((f, i) => {
            const isSel = f.id === selectedFeature?.id
            return (
              <div key={f.id}>
                <button
                  className={clsx(s.mrow, s.mrowBtn, isSel && !selectedDetail && s.mrowSel)}
                  aria-current={(isSel && !selectedDetail) || undefined}
                  aria-expanded={f.detailFeatures.length > 0 ? isSel : undefined}
                  onClick={() => selectSpecFeature(f.id)}
                >
                  <span className={s.idx}>{i + 1}</span>
                  {f.name}
                  <span className={s.chevr}>›</span>
                </button>
                {isSel &&
                  f.detailFeatures.map((d) => (
                    <button
                      key={d.id}
                      className={clsx(s.mrow, s.mrowBtn, s.mrowChild, d.id === selectedDetail?.id && s.mrowSel)}
                      aria-current={d.id === selectedDetail?.id || undefined}
                      onClick={() => selectSpecDetail(f.id, d.id)}
                    >
                      {d.title}
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

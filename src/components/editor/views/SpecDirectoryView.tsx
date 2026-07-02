"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import s from "../editor.module.css"

// 디렉토리(밀러 2컬럼) — 요구사항 → 기능/상세 기능. 선택은 store 공유(#41).
// 선택 상세는 공용 인스펙터(우패널)가 보여준다 — ASM-017에서 3번째 컬럼 이주(A-11 상세 단일 집).
// 벌크 체크박스는 #34(벌크 액션) 구현까지 숨김(A-6 — 반응 없는 컨트롤 노출 금지).
export function SpecDirectoryView({
  requirements,
  features,
  selectedReq,
  selectedFeature,
  selectedDetail,
}: {
  requirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedFeature: Feature | null
  selectedDetail: DetailFeature | null
}) {
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const selectSpecDetail = useEditorStore((st) => st.selectSpecDetail)

  return (
    <div className={s.miller}>
      {/* 요구사항 */}
      <div className={s.mcol}>
        <div className={s.mcolHead}>요구사항</div>
        <div className={s.mlist}>
          {requirements.length === 0 && (
            <div className={s.emptyCol}>조건에 맞는 요구사항이 없어요. 필터를 풀거나 검색어를 바꿔보세요.</div>
          )}
          {requirements.map((r, i) => {
            const isSel = r.id === selectedReq?.id
            return (
              <button
                key={r.id}
                className={clsx(s.mrow, s.mrowBtn, isSel && s.mrowSel)}
                aria-current={isSel || undefined}
                onClick={() => selectSpecReq(r.id)}
              >
                <span className={s.idx}>{i + 1}</span>
                {r.title}
                <span className={r.priority === "high" ? s.starOn : s.star}>
                  {r.priority === "high" ? "★" : "☆"}
                </span>
              </button>
            )
          })}
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

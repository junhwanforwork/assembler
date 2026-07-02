"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { RequirementStatusPill, PriorityBars } from "./Badges"
import s from "../editor.module.css"

// 디렉토리(밀러 3컬럼) — 요구사항 → 기능/상세 기능 → 상세 패널. 선택은 store 공유(#41).
// 상세 패널은 선택 경로의 가장 깊은 것을 보여준다: 상세 기능 > 기능 > 요구사항(#31·#35).
// 행 = 체크박스와 선택 버튼을 형제로 배치(중첩 인터랙티브 회피 — role="button" 행 패턴 폐기).
export function SpecDirectoryView({
  requirements,
  allRequirements,
  features,
  selectedReq,
  selectedFeature,
  selectedDetail,
  checked,
  onToggleCheck,
  onJumpToReq,
}: {
  requirements: Requirement[]
  allRequirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedFeature: Feature | null
  selectedDetail: DetailFeature | null
  checked: Set<string>
  onToggleCheck: (id: string) => void
  // #39 점프 — 필터에 걸러진 대상도 안전하게 이동(필터 해제)하도록 부모가 처리한다.
  onJumpToReq: (id: string) => void
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
              <div key={r.id} className={clsx(s.mrow, isSel && s.mrowSel)}>
                <input
                  type="checkbox"
                  aria-label={`${r.title} 선택`}
                  checked={checked.has(r.id)}
                  onChange={() => onToggleCheck(r.id)}
                />
                <button
                  className={s.mrowAction}
                  aria-current={isSel || undefined}
                  onClick={() => selectSpecReq(r.id)}
                >
                  <span className={s.idx}>{i + 1}</span>
                  {r.title}
                  <span className={r.priority === "high" ? s.starOn : s.star}>
                    {r.priority === "high" ? "★" : "☆"}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 기능 / 상세 기능 — 선택한 기능은 상세 기능 행을 펼친다(#35) */}
      <div className={s.mcol}>
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

      {/* 상세 */}
      <div className={clsx(s.mcol, s.mcolLast)}>
        <div className={s.mcolHead}>상세</div>
        {selectedDetail && selectedFeature ? (
          <DetailFeaturePanel detail={selectedDetail} feature={selectedFeature} />
        ) : selectedFeature ? (
          <FeaturePanel feature={selectedFeature} allRequirements={allRequirements} onJumpToReq={onJumpToReq} />
        ) : selectedReq ? (
          <RequirementPanel requirement={selectedReq} features={features} />
        ) : (
          <div className={s.emptyCol}>요구사항을 선택하면 상세를 보여드릴게요.</div>
        )}
      </div>
    </div>
  )
}

function RequirementPanel({ requirement, features }: { requirement: Requirement; features: Feature[] }) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  return (
    <div className={s.detail}>
      <div className={s.detailTop}>
        <div className={s.detailTitle}>{requirement.title}</div>
      </div>
      <div className={s.metaRow}>
        <span>
          ID <b>{requirement.id}</b>
        </span>
        <span>
          상태 <RequirementStatusPill status={requirement.status} />
        </span>
        <span>
          중요도 <PriorityBars priority={requirement.priority} />
        </span>
        {requirement.role && (
          <span>
            역할 <b>{requirement.role}</b>
          </span>
        )}
      </div>

      <div className={s.detailSec}>
        <h4>설명</h4>
        <div className={s.detailDesc}>{requirement.description || "설명이 아직 없어요."}</div>
      </div>

      <div className={s.detailSec}>
        <h4>수용 기준</h4>
        {requirement.acceptanceCriteria.length === 0 && (
          <div className={s.emptyCol} style={{ padding: "4px 0" }}>
            아직 수용 기준이 없어요.
          </div>
        )}
        {requirement.acceptanceCriteria.map((ac, i) => (
          <label className={s.ac} key={`${requirement.id}-ac-${i}`}>
            <input type="checkbox" disabled />
            {ac}
          </label>
        ))}
      </div>

      <div className={s.detailSec}>
        <h4>연결된 기능</h4>
        {features.length === 0 && (
          <div className={s.emptyCol} style={{ padding: "4px 0" }}>
            연결된 기능이 없어요.
          </div>
        )}
        {/* 카드 클릭 = 해당 기능으로 점프(#39) — 선택·상세 패널이 그 기능으로 바뀐다 */}
        {features.map((f) => (
          <button className={s.fcard} key={f.id} onClick={() => selectSpecFeature(f.id)}>
            <div className={s.fh}>
              {f.name}
              <span className={s.fid}>{f.id}</span>
            </div>
            <div className={s.fd}>{f.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function FeaturePanel({
  feature,
  allRequirements,
  onJumpToReq,
}: {
  feature: Feature
  allRequirements: Requirement[]
  onJumpToReq: (id: string) => void
}) {
  const selectSpecDetail = useEditorStore((st) => st.selectSpecDetail)
  const linkedReqs = allRequirements.filter((r) => feature.requirementIds.includes(r.id))

  return (
    <div className={s.detail}>
      <div className={s.detailTop}>
        <div className={s.detailTitle}>{feature.name}</div>
      </div>
      <div className={s.metaRow}>
        <span>
          ID <b>{feature.id}</b>
        </span>
      </div>

      <div className={s.detailSec}>
        <h4>설명</h4>
        <div className={s.detailDesc}>{feature.description || "설명이 아직 없어요."}</div>
      </div>

      <div className={s.detailSec}>
        <h4>상세 기능</h4>
        {feature.detailFeatures.length === 0 && (
          <div className={s.emptyCol} style={{ padding: "4px 0" }}>
            아직 상세 기능이 없어요.
          </div>
        )}
        {feature.detailFeatures.map((d) => (
          <button className={s.fcard} key={d.id} onClick={() => selectSpecDetail(feature.id, d.id)}>
            <div className={s.fh}>
              {d.title}
              <span className={s.fid}>{d.id}</span>
            </div>
            <div className={s.fd}>{d.description}</div>
          </button>
        ))}
      </div>

      <div className={s.detailSec}>
        <h4>연결된 요구사항</h4>
        {linkedReqs.length === 0 && (
          <div className={s.emptyCol} style={{ padding: "4px 0" }}>
            연결된 요구사항이 없어요.
          </div>
        )}
        {linkedReqs.map((r) => (
          <button className={s.fcard} key={r.id} onClick={() => onJumpToReq(r.id)}>
            <div className={s.fh}>
              {r.title}
              <span className={s.fid}>{r.id}</span>
            </div>
            <div className={s.fd}>{r.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailFeaturePanel({ detail, feature }: { detail: DetailFeature; feature: Feature }) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  return (
    <div className={s.detail}>
      <div className={s.detailTop}>
        <div className={s.detailTitle}>{detail.title}</div>
      </div>
      <div className={s.metaRow}>
        <span>
          ID <b>{detail.id}</b>
        </span>
      </div>

      <div className={s.detailSec}>
        <h4>설명</h4>
        <div className={s.detailDesc}>{detail.description || "설명이 아직 없어요."}</div>
      </div>

      <div className={s.detailSec}>
        <h4>소속 기능</h4>
        <button className={s.fcard} onClick={() => selectSpecFeature(feature.id)}>
          <div className={s.fh}>
            {feature.name}
            <span className={s.fid}>{feature.id}</span>
          </div>
          <div className={s.fd}>{feature.description}</div>
        </button>
      </div>
    </div>
  )
}

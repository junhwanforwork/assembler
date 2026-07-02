"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore, EMPTY_SPEC_FILTERS } from "@/lib/stores/useEditorStore"
import { patchDesignScoped } from "@/lib/api/design-patch"
import { IconButton } from "@/components/ui/Button"
import { PlusIcon } from "@/components/ui/icons"
import { buildFeatureNamesByReq, filterRequirements } from "./views/specFilter"
import {
  buildAddAcceptanceCriterionPatch,
  buildAddDetailFeaturePatch,
  createDetailFeature,
} from "./views/specEdit"
import { RequirementStatusPill, PriorityBars } from "./views/Badges"
import { InlineAddInput, useInlineAdd } from "./InlineAddInput"
import { PatchErrorNote } from "./PatchErrorNote"
import s from "./editor.module.css"

// 명세 선택 상세 — 공용 인스펙터(우패널)의 spec 렌더. ASM-017에서 밀러 3번째 컬럼에서 이주(A-11).
// 선택 경로의 가장 깊은 것을 보여준다: 상세 기능 > 기능 > 요구사항(#31·#35).
// 편집: 수용 기준 추가(#37)·상세 기능 추가(#42) — 저장은 patchDesignScoped 단일 경로.

type SaveCtx = {
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}

export function SpecInspector({ design, workspaceId, onDesignChange }: { design: WorkspaceDesign } & SaveCtx) {
  const specSelectedReqId = useEditorStore((st) => st.specSelectedReqId)
  const specSelectedFeatureId = useEditorStore((st) => st.specSelectedFeatureId)
  const specSelectedDetailId = useEditorStore((st) => st.specSelectedDetailId)

  const selectedReq = design.requirements.find((r) => r.id === specSelectedReqId) ?? null
  const features = selectedReq ? design.features.filter((f) => f.requirementIds.includes(selectedReq.id)) : []
  const selectedFeature = features.find((f) => f.id === specSelectedFeatureId) ?? null
  const selectedDetail = selectedFeature?.detailFeatures.find((d) => d.id === specSelectedDetailId) ?? null

  const saveCtx = { workspaceId, onDesignChange }

  // 엔티티 id로 keying — 선택 전환 시 인라인 추가 입력·실패 상태가 다른 항목으로 넘어가지 않게.
  if (selectedDetail && selectedFeature)
    return <DetailFeaturePanel key={selectedDetail.id} detail={selectedDetail} feature={selectedFeature} />
  if (selectedFeature) return <FeaturePanel key={selectedFeature.id} feature={selectedFeature} design={design} {...saveCtx} />
  if (selectedReq) return <RequirementPanel key={selectedReq.id} requirement={selectedReq} features={features} {...saveCtx} />
  return (
    <div className={s.inspEmpty}>
      항목을 선택하면 정보를 보여드릴게요.
      <br />
      기능명세서에서 요구사항이나 기능을 눌러보세요.
    </div>
  )
}

function RequirementPanel({
  requirement,
  features,
  workspaceId,
  onDesignChange,
}: { requirement: Requirement; features: Feature[] } & SaveCtx) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  // #37 — 빈 인라인 입력 → acceptanceCriteria push → PATCH design. 빈 문자열이면 취소(입력 컴포넌트 계약).
  const addCriterion = useInlineAdd(async (text) => {
    const outcome = await patchDesignScoped(
      workspaceId,
      (latest) => buildAddAcceptanceCriterionPatch(latest, requirement.id, text),
      onDesignChange,
    )
    return outcome.ok ? null : outcome
  })

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
        <h4>
          수용 기준
          <IconButton label="수용 기준 추가" onClick={addCriterion.open} disabled={addCriterion.adding}>
            <PlusIcon size={14} />
          </IconButton>
        </h4>
        {requirement.acceptanceCriteria.length === 0 && !addCriterion.adding && (
          <div className={clsx(s.emptyCol, s.emptyColSlim)}>
            아직 수용 기준이 없어요.
          </div>
        )}
        {requirement.acceptanceCriteria.map((ac, i) => (
          <label className={s.ac} key={`${requirement.id}-ac-${i}`}>
            <input type="checkbox" disabled />
            {ac}
          </label>
        ))}
        {addCriterion.adding && (
          <div className={s.inlineAddRow}>
            <InlineAddInput
              placeholder="수용 기준을 입력해 주세요"
              ariaLabel="새 수용 기준"
              saving={addCriterion.saving}
              hasError={!!addCriterion.failure}
              onCommit={addCriterion.commit}
              onCancel={addCriterion.cancel}
            />
          </div>
        )}
        {addCriterion.failure && (
          <div className={s.inlineAddNote}>
            <PatchErrorNote
              failure={addCriterion.failure}
              staleText="이 요구사항을 찾을 수 없어요. 목록을 다시 확인해 주세요."
            />
          </div>
        )}
      </div>

      <div className={s.detailSec}>
        <h4>연결된 기능</h4>
        {features.length === 0 && (
          <div className={clsx(s.emptyCol, s.emptyColSlim)}>
            연결된 기능이 없어요.
          </div>
        )}
        {/* 카드 클릭 = 해당 기능으로 점프(#39) — 선택·상세가 그 기능으로 바뀐다 */}
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
  design,
  workspaceId,
  onDesignChange,
}: { feature: Feature; design: WorkspaceDesign } & SaveCtx) {
  const selectSpecDetail = useEditorStore((st) => st.selectSpecDetail)
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const specFilters = useEditorStore((st) => st.specFilters)
  const setSpecFilters = useEditorStore((st) => st.setSpecFilters)
  const linkedReqs = design.requirements.filter((r) => feature.requirementIds.includes(r.id))

  // #42 — 해당 Feature 하위 DetailFeature 인라인 추가 → detailFeatures push → PATCH design.
  const addDetail = useInlineAdd(async (text) => {
    const outcome = await patchDesignScoped(
      workspaceId,
      (latest) => buildAddDetailFeaturePatch(latest, feature.id, createDetailFeature(text)),
      onDesignChange,
    )
    return outcome.ok ? null : outcome
  })

  // #39 점프 — 대상이 명세 뷰 필터에 걸러져 있으면 필터를 풀고 이동한다(조용한 오점프 방지).
  // 인스펙터는 어느 뷰에서든 떠 있으므로 목적지(명세 뷰)로도 데려간다.
  const jumpToReq = (id: string) => {
    const visible = filterRequirements(design.requirements, buildFeatureNamesByReq(design.features), specFilters)
    if (!visible.some((r) => r.id === id)) setSpecFilters(EMPTY_SPEC_FILTERS)
    selectSpecReq(id)
    setActiveView("spec")
  }

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
        <h4>
          상세 기능
          <IconButton label="상세 기능 추가" onClick={addDetail.open} disabled={addDetail.adding}>
            <PlusIcon size={14} />
          </IconButton>
        </h4>
        {feature.detailFeatures.length === 0 && !addDetail.adding && (
          <div className={clsx(s.emptyCol, s.emptyColSlim)}>
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
        {addDetail.adding && (
          <div className={s.inlineAddRow}>
            <InlineAddInput
              placeholder="상세 기능 이름을 입력해 주세요"
              ariaLabel="새 상세 기능"
              saving={addDetail.saving}
              hasError={!!addDetail.failure}
              onCommit={addDetail.commit}
              onCancel={addDetail.cancel}
            />
          </div>
        )}
        {addDetail.failure && (
          <div className={s.inlineAddNote}>
            <PatchErrorNote
              failure={addDetail.failure}
              staleText="이 기능을 찾을 수 없어요. 목록을 다시 확인해 주세요."
            />
          </div>
        )}
      </div>

      <div className={s.detailSec}>
        <h4>연결된 요구사항</h4>
        {linkedReqs.length === 0 && (
          <div className={clsx(s.emptyCol, s.emptyColSlim)}>
            연결된 요구사항이 없어요.
          </div>
        )}
        {linkedReqs.map((r) => (
          <button className={s.fcard} key={r.id} onClick={() => jumpToReq(r.id)}>
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

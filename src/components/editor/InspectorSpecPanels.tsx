"use client"

import { clsx } from "clsx"
import type { DetailFeature, Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { patchDesignScoped } from "@/lib/api/design-patch"
import { Button, IconButton } from "@/components/ui/Button"
import { PlusIcon } from "@/components/ui/icons"
import { useSpecJump } from "./useSpecJump"
import { resolveSuggestionJump, type SuggestionJump } from "./suggestionsTarget"
import {
  buildAddAcceptanceCriterionPatch,
  buildAddDetailFeaturePatch,
  createDetailFeature,
} from "./views/specEdit"
import { RequirementStatusPill, PriorityBars } from "./views/Badges"
import { InlineAddInput, useInlineAdd } from "./InlineAddInput"
import { PatchErrorNote } from "./PatchErrorNote"
import s from "./editor.module.css"
import p from "./InspectorSpecPanels.module.css"

// 선택 항목을 명세 노드(트리) 뷰로 여는 헤더 액션 — useSpecJump(선택·필터 해제·명세 뷰 이동)에
// 노드 모드 전환을 더한다. 기존 store 세터만 소비(정의 변경 아님).
function useOpenSpecInTree(design: WorkspaceDesign): (target: SuggestionJump) => void {
  const jump = useSpecJump(design)
  const setSpecViewMode = useEditorStore((st) => st.setSpecViewMode)
  return (target: SuggestionJump) => {
    jump(target)
    setSpecViewMode("node")
  }
}

// 상세 헤더 우측 "트리에서 열기" — 대상 해석이 실패(부모 요구사항 없음)하면 렌더하지 않는다(거짓 버튼 금지).
function OpenInTreeAction({ target, onOpen }: { target: SuggestionJump | null; onOpen: (t: SuggestionJump) => void }) {
  if (!target) return null
  return (
    <Button variant="ghost" size="sm" className={p.headerAction} onClick={() => onOpen(target)}>
      트리에서 열기
    </Button>
  )
}

// Ask AI to edit(ASM-082) — 선택 항목을 좌측 프롬프트에 채워 "AI로 수정" 요청을 시작한다.
// 자동 전송이 아니라 프리필(채우기)만 — 사용자가 확인/편집 후 보낸다(유료 발사는 사용자 몫).
function AskAiAction({ prefill }: { prefill: string }) {
  const setPromptPrefill = useEditorStore((st) => st.setPromptPrefill)
  return (
    <Button variant="ghost" size="sm" className={p.headerAction} onClick={() => setPromptPrefill(prefill)}>
      Ask AI to edit
    </Button>
  )
}

// 명세 선택 상세 — 공용 인스펙터(우패널)의 spec 렌더. ASM-017에서 밀러 3번째 컬럼에서 이주(A-11).
// 선택 경로의 가장 깊은 것을 보여준다: 상세 기능 > 기능 > 요구사항(#31·#35).
// suggestions 카드(ASM-023)는 여기가 아니라 아이템 3dot 메뉴(SpecItemMenu)에서 꺼낸다 — 상태는 store 캐시.
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
    return <DetailFeaturePanel key={selectedDetail.id} detail={selectedDetail} feature={selectedFeature} design={design} />
  if (selectedFeature) return <FeaturePanel key={selectedFeature.id} feature={selectedFeature} design={design} {...saveCtx} />
  if (selectedReq)
    return <RequirementPanel key={selectedReq.id} requirement={selectedReq} features={features} design={design} {...saveCtx} />
  return (
    <div className={s.inspEmpty}>
      항목을 선택하면 정보를 보여드릴게요.
      <br />
      명세의 요구사항·기능이나 데이터 뷰의 테이블을 눌러보세요.
    </div>
  )
}

function RequirementPanel({
  requirement,
  features,
  design,
  workspaceId,
  onDesignChange,
}: { requirement: Requirement; features: Feature[]; design: WorkspaceDesign } & SaveCtx) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const openInTree = useOpenSpecInTree(design)

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
        <AskAiAction prefill={`이 요구사항을 수정하고 싶어요: "${requirement.title}" — `} />
        <OpenInTreeAction target={{ kind: "requirement", reqId: requirement.id }} onOpen={openInTree} />
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
        {/* 추적 모델이 없는 읽기 전용 목록 — 체크박스(거짓 어포던스) 대신 불릿(X-11). */}
        {requirement.acceptanceCriteria.map((ac, i) => (
          <div className={s.ac} key={`${requirement.id}-ac-${i}`}>
            <span className={s.acDot} aria-hidden />
            {ac}
          </div>
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
  // #39 점프 가드 — SuggestionsCard·ImpactSection과 같은 규칙(useSpecJump 단일 출처).
  const jump = useSpecJump(design)
  const openInTree = useOpenSpecInTree(design)
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

  return (
    <div className={s.detail}>
      <div className={s.detailTop}>
        <div className={s.detailTitle}>{feature.name}</div>
        <AskAiAction prefill={`이 기능을 수정하고 싶어요: "${feature.name}" — `} />
        <OpenInTreeAction target={resolveSuggestionJump(design, "feature", feature.id)} onOpen={openInTree} />
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
          <button className={s.fcard} key={r.id} onClick={() => jump({ kind: "requirement", reqId: r.id })}>
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

function DetailFeaturePanel({
  detail,
  feature,
  design,
}: { detail: DetailFeature; feature: Feature; design: WorkspaceDesign }) {
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)
  const openInTree = useOpenSpecInTree(design)

  return (
    <div className={s.detail}>
      <div className={s.detailTop}>
        <div className={s.detailTitle}>{detail.title}</div>
        <AskAiAction prefill={`이 상세 기능을 수정하고 싶어요: "${detail.title}" — `} />
        <OpenInTreeAction target={resolveSuggestionJump(design, "feature", feature.id)} onOpen={openInTree} />
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

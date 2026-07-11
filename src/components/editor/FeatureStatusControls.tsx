"use client"

import { useState } from "react"
import type {
  ChangeStatus,
  Feature,
  ImplStatus,
  ReviewRole,
  ReviewState,
  WorkspaceDesign,
} from "@/lib/types/assembler"
import { patchDesignScoped, type DesignPatchFailure } from "@/lib/api/design-patch"
import { Select } from "@/components/ui/Select"
import { Segmented, SegmentedButton } from "@/components/ui/Segmented"
import { buildSetChangeStatusPatch, buildSetImplStatusPatch, buildSetReviewPatch } from "./views/specEdit"
import {
  CHANGE_STATUS_LABEL,
  IMPL_STATUS_LABEL,
  REVIEW_ROLE_LABEL,
  REVIEW_STATE_LABEL,
} from "./views/specViewFormat"
import { PatchErrorNote } from "./PatchErrorNote"
import styles from "./FeatureStatusControls.module.css"

// 기능 상세 "상태" 섹션 — 구현 여부·변경 여부(Select ×2) + 역할별 확인(기획/디자인/개발, 3상태 Segmented).
// 저장은 specEdit 빌더(같은 값=null 스킵) + patchDesignScoped(최신 GET→스코프드 PATCH·409 재시도 1회).
// 프롭 계약은 레인 0이 동결 — 마운트(InspectorSpecPanels)가 이 형태로 호출한다.

// 라벨 맵은 정적이므로 옵션도 모듈 스코프 상수(렌더마다 재생성 안 함).
const IMPL_OPTIONS = (Object.entries(IMPL_STATUS_LABEL) as [ImplStatus, string][]).map(([value, label]) => ({
  value,
  label,
}))
const CHANGE_OPTIONS = (Object.entries(CHANGE_STATUS_LABEL) as [ChangeStatus, string][]).map(([value, label]) => ({
  value,
  label,
}))
const REVIEW_ROLES: ReviewRole[] = ["planner", "designer", "developer"]
const REVIEW_STATES: ReviewState[] = ["not_checked", "checked", "needs_discussion"]

export function FeatureStatusControls({
  feature,
  workspaceId,
  onDesignChange,
}: {
  feature: Feature
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  // 저장 중엔 모든 컨트롤을 잠가 이중 클릭·경쟁 저장을 막는다.
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<DesignPatchFailure | null>(null)

  // 레거시 저장본(필드 없음)은 기본값으로 렌더.
  const implStatus = feature.implStatus ?? "unknown"
  const changeStatus = feature.changeStatus ?? "no_change"

  const save = async (build: (latest: WorkspaceDesign) => ReturnType<typeof buildSetImplStatusPatch>) => {
    setFailure(null)
    setSaving(true)
    try {
      const outcome = await patchDesignScoped(workspaceId, build, onDesignChange)
      if (!outcome.ok) setFailure(outcome)
    } finally {
      setSaving(false)
    }
  }

  const onImplChange = (value: ImplStatus) => {
    // 같은 값 재선택 = 저장 스킵(호출 자체를 건너뛴다 — 불필요 PATCH 0).
    if (value === implStatus) return
    void save((latest) => buildSetImplStatusPatch(latest, feature.id, value))
  }

  const onChangeStatusChange = (value: ChangeStatus) => {
    if (value === changeStatus) return
    void save((latest) => buildSetChangeStatusPatch(latest, feature.id, value))
  }

  const onReviewChange = (role: ReviewRole, state: ReviewState) => {
    const current = feature.reviews?.[role] ?? "not_checked"
    // not_checked 재클릭 등 무변경은 조용히 무시(저장 스킵).
    if (state === current) return
    void save((latest) => buildSetReviewPatch(latest, feature.id, role, state))
  }

  return (
    <div className={styles.section}>
      <h4 className={styles.heading}>상태</h4>

      <div className={styles.row}>
        <span className={styles.label}>구현 여부</span>
        <Select
          value={implStatus}
          onChange={onImplChange}
          options={IMPL_OPTIONS}
          aria-label="구현 상태"
          disabled={saving}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>변경 여부</span>
        <Select
          value={changeStatus}
          onChange={onChangeStatusChange}
          options={CHANGE_OPTIONS}
          aria-label="변경 상태"
          disabled={saving}
        />
      </div>

      <div className={styles.reviewBlock}>
        <span className={styles.label}>역할별 확인</span>
        {REVIEW_ROLES.map((role) => {
          const current = feature.reviews?.[role] ?? "not_checked"
          return (
            <div key={role} className={styles.reviewRow}>
              <span className={styles.roleLabel}>{REVIEW_ROLE_LABEL[role]}</span>
              <Segmented tone="card" aria-label={`${REVIEW_ROLE_LABEL[role]} 확인`}>
                {REVIEW_STATES.map((state) => (
                  <SegmentedButton
                    key={state}
                    active={current === state}
                    disabled={saving}
                    onClick={() => onReviewChange(role, state)}
                  >
                    {REVIEW_STATE_LABEL[state]}
                  </SegmentedButton>
                ))}
              </Segmented>
            </div>
          )
        })}
      </div>

      {failure && (
        <PatchErrorNote failure={failure} staleText="이 기능이 지금 스펙에 없어 저장하지 못했어요. 목록을 다시 확인해 주세요." />
      )}
    </div>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"
import type { Priority, RequirementStatus, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { patchDesignScoped, type DesignPatchFailure } from "@/lib/api/design-patch"
import { Select, type SelectOption } from "@/components/ui/Select"
import { IconButton } from "@/components/ui/Button"
import {
  buildFeatureNamesByReq,
  collectRoles,
  EMPTY_SPEC_FILTERS,
  filterRequirements,
  hasActiveSpecFilters,
} from "./specFilter"
import {
  buildAddRequirementPatch,
  buildBulkRequirementPatch,
  createRequirement,
  type BulkRequirementChange,
} from "./specEdit"
import { SpecDirectoryView } from "./SpecDirectoryView"
import { SpecBulkBar, SpecBulkNotice } from "./SpecBulkBar"
import { CloseIcon, DocViewIcon, SearchIcon } from "../icons"
import s from "../editor.module.css"

const STATUS_OPTIONS: SelectOption<RequirementStatus | "all">[] = [
  { value: "all", label: "상태: 전체" },
  { value: "draft", label: "상태: 작성중" },
  { value: "approved", label: "상태: 승인됨" },
  { value: "deprecated", label: "상태: 중단됨" },
]

const PRIORITY_OPTIONS: SelectOption<Priority | "all">[] = [
  { value: "all", label: "중요도: 전체" },
  { value: "high", label: "중요도: 높음" },
  { value: "medium", label: "중요도: 중간" },
  { value: "low", label: "중요도: 낮음" },
]

// 기능명세서 — 필터(#27)·검색(#29)은 store 소유(인스펙터 점프 가드와 공유), 선택도 store 공유(#41).
// 트리 뷰는 숨김 확정(#28) — 코드는 SpecTreeView에 보존, 4차 N:M 그래프 재설계 시 부활.
// 편집(#30 요구사항 추가·#34 벌크)의 저장 오케스트레이션도 여기 — 뷰 하위는 표시·입력만 맡는다.
export function SpecView({
  design,
  workspaceId,
  onDesignChange,
}: {
  design: WorkspaceDesign
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const specSelectedReqId = useEditorStore((st) => st.specSelectedReqId)
  const specSelectedFeatureId = useEditorStore((st) => st.specSelectedFeatureId)
  const specSelectedDetailId = useEditorStore((st) => st.specSelectedDetailId)
  const specCheckedIds = useEditorStore((st) => st.specCheckedIds)
  const clearSpecChecks = useEditorStore((st) => st.clearSpecChecks)
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const filters = useEditorStore((st) => st.specFilters)
  const setFilters = useEditorStore((st) => st.setSpecFilters)

  const [searchOpen, setSearchOpen] = useState(false)

  // 벌크 적용 확인 — 성공하면 체크가 풀려 바가 내려가므로 확인은 바 밖 노티스로(잠깐 떴다 사라짐).
  const [bulkNotice, setBulkNotice] = useState<string | null>(null)
  const bulkNoticeTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (bulkNoticeTimer.current !== null) window.clearTimeout(bulkNoticeTimer.current)
    },
    [],
  )
  const showBulkNotice = (text: string) => {
    if (bulkNoticeTimer.current !== null) window.clearTimeout(bulkNoticeTimer.current)
    setBulkNotice(text)
    bulkNoticeTimer.current = window.setTimeout(() => setBulkNotice(null), 2600)
  }

  // 역할 옵션 = design에 실재하는 고유값(하드코딩 금지).
  const roleOptions = useMemo<SelectOption[]>(
    () => [
      { value: "all", label: "역할: 전체" },
      ...collectRoles(design.requirements).map((role) => ({ value: role, label: `역할: ${role}` })),
    ],
    [design.requirements],
  )

  const featureNamesByReq = useMemo(() => buildFeatureNamesByReq(design.features), [design.features])
  const requirements = useMemo(
    () => filterRequirements(design.requirements, featureNamesByReq, filters),
    [design.requirements, featureNamesByReq, filters],
  )

  // 선택 보정 — 명시 선택이 필터·검색에 걸러지면 보이는 첫 항목으로. 하위 선택도 유효할 때만 산다.
  const selectedReq = requirements.find((r) => r.id === specSelectedReqId) ?? requirements[0] ?? null
  const syncSpecSelection = useEditorStore((st) => st.syncSpecSelection)

  // 보정이 화면에만 남으면 store의 stale id가 필터 해제 때 "부활"한다 — 보정 즉시 store를 동기화.
  // sync 액션은 inspected를 건드리지 않는다 — 뷰 전환이 테이블 인스펙션을 하이재킹하지 않게.
  useEffect(() => {
    if (selectedReq && specSelectedReqId !== selectedReq.id) syncSpecSelection(selectedReq.id)
  }, [selectedReq, specSelectedReqId, syncSpecSelection])

  const features = useMemo(
    () => (selectedReq ? design.features.filter((f) => f.requirementIds.includes(selectedReq.id)) : []),
    [design.features, selectedReq],
  )
  const selectedFeature = features.find((f) => f.id === specSelectedFeatureId) ?? null
  const selectedDetail = selectedFeature?.detailFeatures.find((d) => d.id === specSelectedDetailId) ?? null

  // '연결 안 됨'(#30) — 어떤 기능도 참조하지 않는 요구사항. 생성 직후부터 파생으로 정확하다.
  const unlinkedReqIds = useMemo(
    () => new Set(design.requirements.filter((r) => !featureNamesByReq.has(r.id)).map((r) => r.id)),
    [design.requirements, featureNamesByReq],
  )

  // 벌크(#34)는 지금 보이는 행에만 — 필터에 걸러진 체크가 안 보이는 채로 바뀌지 않게.
  const effectiveCheckedIds = useMemo(
    () => specCheckedIds.filter((id) => requirements.some((r) => r.id === id)),
    [specCheckedIds, requirements],
  )

  // #30 — 추가 후 목록 추가+선택. 새 항목이 필터에 걸리면 해제 후 선택(#39 오점프 방지 패턴).
  const addRequirement = async (title: string): Promise<DesignPatchFailure | null> => {
    const requirement = createRequirement(title)
    const outcome = await patchDesignScoped(
      workspaceId,
      (latest) => buildAddRequirementPatch(latest, requirement),
      onDesignChange,
    )
    if (!outcome.ok) return outcome
    const visible = filterRequirements(
      outcome.design.requirements,
      buildFeatureNamesByReq(outcome.design.features),
      filters,
    )
    if (!visible.some((r) => r.id === requirement.id)) setFilters(EMPTY_SPEC_FILTERS)
    selectSpecReq(requirement.id)
    return null
  }

  // #34 — 상태·역할 일괄 갱신을 PATCH 1회로. 성공 시 체크 해제 — 필터에 걸려 안 보이는
  // 체크가 store에 잔존하다 나중에 부활하지 않게. 확인은 바 밖 노티스로.
  const applyBulk = async (change: BulkRequirementChange): Promise<DesignPatchFailure | null> => {
    const ids = effectiveCheckedIds
    const outcome = await patchDesignScoped(
      workspaceId,
      (latest) => buildBulkRequirementPatch(latest, ids, change),
      onDesignChange,
    )
    if (!outcome.ok) return outcome
    clearSpecChecks()
    showBulkNotice(`${ids.length}개에 적용했어요`)
    return null
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setFilters({ query: "" })
  }

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>기능</span>
        <div className={s.spacer} />
        <button
          className={clsx(s.pillSelect, !hasActiveSpecFilters(filters) && s.pillSelectOn)}
          onClick={() => {
            setFilters(EMPTY_SPEC_FILTERS)
            setSearchOpen(false)
          }}
        >
          전체 보기
        </button>
        <Select
          aria-label="상태 필터"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => setFilters({ status: v })}
        />
        <Select
          aria-label="사용자 역할 필터"
          value={filters.role}
          options={roleOptions}
          onChange={(v) => setFilters({ role: v })}
        />
        <Select
          aria-label="중요도 필터"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(v) => setFilters({ priority: v })}
        />
      </div>

      <div className={s.specBody}>
        <div className={s.specRail}>
          {/* X-07 해소 — 문서 투사는 문서 뷰(DocView) 단일 소유. 레일엔 점프만 남긴다(#23 doc 점프 관례). */}
          <button className={s.railBtn} onClick={() => setActiveView("doc")} aria-label="문서로 보기" title="문서로 보기">
            <DocViewIcon />
          </button>
          <button
            className={clsx(s.railBtn, searchOpen && s.railBtnActive)}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            aria-label="검색"
            aria-expanded={searchOpen}
          >
            <SearchIcon />
          </button>
        </div>

        <div className={s.specMain}>
          {searchOpen && (
            <div className={s.specSearchRow}>
              <SearchIcon />
              <input
                className={s.specSearchInput}
                autoFocus
                placeholder="요구사항·기능 이름으로 찾기"
                aria-label="명세 검색"
                value={filters.query}
                onChange={(e) => setFilters({ query: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch()
                }}
              />
              <IconButton label="검색 닫기" onClick={closeSearch}>
                <CloseIcon />
              </IconButton>
            </div>
          )}

          {/* 디렉토리가 명세의 유일한 본문(X-07) — 잔존 store 값("tree"·"doc")과 무관하게 렌더한다. */}
          <SpecDirectoryView
            requirements={requirements}
            features={features}
            selectedReq={selectedReq}
            selectedFeature={selectedFeature}
            selectedDetail={selectedDetail}
            unlinkedReqIds={unlinkedReqIds}
            onAddRequirement={addRequirement}
          />
        </div>

        {effectiveCheckedIds.length > 0 && (
          <SpecBulkBar count={effectiveCheckedIds.length} checkedIds={effectiveCheckedIds} onApply={applyBulk} />
        )}
        {effectiveCheckedIds.length === 0 && bulkNotice && <SpecBulkNotice text={bulkNotice} />}
      </div>
    </section>
  )
}

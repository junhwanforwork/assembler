"use client"

import { useEffect, useMemo, useState } from "react"
import { clsx } from "clsx"
import type { Feature, Priority, Requirement, RequirementStatus, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Select, type SelectOption } from "@/components/ui/Select"
import { IconButton } from "@/components/ui/Button"
import {
  buildFeatureNamesByReq,
  collectRoles,
  EMPTY_SPEC_FILTERS,
  filterRequirements,
  hasActiveSpecFilters,
} from "./specFilter"
import { SpecDirectoryView } from "./SpecDirectoryView"
import { CloseIcon, DirViewIcon, DocViewIcon, SearchIcon } from "../icons"
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
export function SpecView({ design }: { design: WorkspaceDesign }) {
  const specView = useEditorStore((st) => st.specView)
  const setSpecView = useEditorStore((st) => st.setSpecView)
  const specSelectedReqId = useEditorStore((st) => st.specSelectedReqId)
  const specSelectedFeatureId = useEditorStore((st) => st.specSelectedFeatureId)
  const specSelectedDetailId = useEditorStore((st) => st.specSelectedDetailId)
  const filters = useEditorStore((st) => st.specFilters)
  const setFilters = useEditorStore((st) => st.setSpecFilters)

  const [searchOpen, setSearchOpen] = useState(false)

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

  const closeSearch = () => {
    setSearchOpen(false)
    setFilters({ query: "" })
  }

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>기능명세서</span>
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
          <button
            className={clsx(s.railBtn, specView !== "doc" && s.railBtnActive)}
            onClick={() => setSpecView("dir")}
            aria-label="디렉토리 뷰"
          >
            <DirViewIcon />
          </button>
          <button
            className={clsx(s.railBtn, specView === "doc" && s.railBtnActive)}
            onClick={() => setSpecView("doc")}
            aria-label="도큐먼트 뷰"
          >
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

          {/* 트리("tree")는 숨김 — 잔존 store 값이 있어도 디렉토리로 폴백한다. */}
          {specView !== "doc" && (
            <SpecDirectoryView
              requirements={requirements}
              features={features}
              selectedReq={selectedReq}
              selectedFeature={selectedFeature}
              selectedDetail={selectedDetail}
            />
          )}

          {specView === "doc" && <DocumentView requirements={requirements} features={design.features} />}
        </div>
      </div>
    </section>
  )
}

function DocumentView({ requirements, features }: { requirements: Requirement[]; features: Feature[] }) {
  if (requirements.length === 0) {
    return (
      <div className={s.emptyCol} style={{ flex: 1 }}>
        조건에 맞는 요구사항이 없어요. 필터를 풀거나 검색어를 바꿔보세요.
      </div>
    )
  }
  return (
    <div className={s.specdoc}>
      {requirements.map((r) => {
        const linked = features.filter((f) => f.requirementIds.includes(r.id))
        return (
          <div className={s.specdocBlock} key={r.id}>
            <h2>{r.title}</h2>
            <p className={s.lead}>{r.description || "설명이 아직 없어요."}</p>
            {linked.map((f) => (
              <div key={f.id}>
                <h3>{f.name}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

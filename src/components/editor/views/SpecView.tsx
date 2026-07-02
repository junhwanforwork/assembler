"use client"

import { useMemo, useState } from "react"
import { clsx } from "clsx"
import type { Feature, Priority, Requirement, RequirementStatus, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Select, type SelectOption } from "@/components/ui/Select"
import { IconButton } from "@/components/ui/Button"
import {
  collectRoles,
  EMPTY_SPEC_FILTERS,
  filterRequirements,
  hasActiveSpecFilters,
  type SpecFilters,
} from "./specFilter"
import { SpecDirectoryView } from "./SpecDirectoryView"
import { SpecTreeView } from "./SpecTreeView"
import { CloseIcon, DirViewIcon, DocViewIcon, SearchIcon, TreeViewIcon } from "../icons"
import s from "../editor.module.css"

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태: 전체" },
  { value: "draft", label: "상태: 작성중" },
  { value: "approved", label: "상태: 승인됨" },
  { value: "deprecated", label: "상태: 중단됨" },
]

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "all", label: "중요도: 전체" },
  { value: "high", label: "중요도: 높음" },
  { value: "medium", label: "중요도: 중간" },
  { value: "low", label: "중요도: 낮음" },
]

// 기능명세서 — 필터(#27)·검색(#29)은 뷰 로컬, 선택은 store 공유(#41). 트리/디렉토리/도큐먼트 3뷰.
export function SpecView({ design }: { design: WorkspaceDesign }) {
  const specView = useEditorStore((st) => st.specView)
  const setSpecView = useEditorStore((st) => st.setSpecView)
  const specSelectedReqId = useEditorStore((st) => st.specSelectedReqId)
  const specSelectedFeatureId = useEditorStore((st) => st.specSelectedFeatureId)
  const specSelectedDetailId = useEditorStore((st) => st.specSelectedDetailId)

  const [filters, setFilters] = useState<SpecFilters>(EMPTY_SPEC_FILTERS)
  const [searchOpen, setSearchOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // 역할 옵션 = design에 실재하는 고유값(하드코딩 금지).
  const roleOptions = useMemo<SelectOption[]>(
    () => [
      { value: "all", label: "역할: 전체" },
      ...collectRoles(design.requirements).map((role) => ({ value: role, label: `역할: ${role}` })),
    ],
    [design.requirements],
  )

  const requirements = useMemo(
    () => filterRequirements(design.requirements, design.features, filters),
    [design.requirements, design.features, filters],
  )

  // 선택 보정 — 명시 선택이 필터·검색에 걸러지면 보이는 첫 항목으로. 하위 선택도 유효할 때만 산다.
  const selectedReq = requirements.find((r) => r.id === specSelectedReqId) ?? requirements[0] ?? null
  const features = useMemo(
    () => (selectedReq ? design.features.filter((f) => f.requirementIds.includes(selectedReq.id)) : []),
    [design.features, selectedReq],
  )
  const selectedFeature = features.find((f) => f.id === specSelectedFeatureId) ?? null
  const selectedDetail = selectedFeature?.detailFeatures.find((d) => d.id === specSelectedDetailId) ?? null

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const closeSearch = () => {
    setSearchOpen(false)
    setFilters((f) => ({ ...f, query: "" }))
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
          onChange={(v) => setFilters((f) => ({ ...f, status: v as RequirementStatus | "all" }))}
        />
        <Select
          aria-label="사용자 역할 필터"
          value={filters.role}
          options={roleOptions}
          onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
        />
        <Select
          aria-label="중요도 필터"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, priority: v as Priority | "all" }))}
        />
      </div>

      <div className={s.specBody}>
        <div className={s.specRail}>
          <button
            className={clsx(s.railBtn, specView === "tree" && s.railBtnActive)}
            onClick={() => setSpecView("tree")}
            aria-label="트리 뷰"
          >
            <TreeViewIcon />
          </button>
          <button
            className={clsx(s.railBtn, specView === "dir" && s.railBtnActive)}
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
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch()
                }}
              />
              <IconButton label="검색 닫기" onClick={closeSearch}>
                <CloseIcon />
              </IconButton>
            </div>
          )}

          {specView === "dir" && (
            <SpecDirectoryView
              requirements={requirements}
              allRequirements={design.requirements}
              features={features}
              selectedReq={selectedReq}
              selectedFeature={selectedFeature}
              selectedDetail={selectedDetail}
              checked={checked}
              onToggleCheck={toggleCheck}
            />
          )}

          {specView === "doc" && <DocumentView requirements={requirements} features={design.features} />}

          {specView === "tree" && (
            <SpecTreeView
              requirements={requirements}
              features={design.features}
              selectedReqId={selectedReq?.id ?? null}
              selectedFeatureId={selectedFeature?.id ?? null}
            />
          )}
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

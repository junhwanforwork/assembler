"use client"

import { useMemo, useState, type KeyboardEvent } from "react"
import { clsx } from "clsx"
import type { Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { RequirementStatusPill, PriorityBars } from "./Badges"
import { DirViewIcon, DocViewIcon, SearchIcon, TreeViewIcon } from "../icons"
import s from "../editor.module.css"

// 기능명세서 — 실데이터. 미니레일(트리/디렉토리/도큐먼트) + 디렉토리(밀러 3컬럼).
export function SpecView({ design }: { design: WorkspaceDesign }) {
  const specView = useEditorStore((st) => st.specView)
  const setSpecView = useEditorStore((st) => st.setSpecView)

  const [selectedReqId, setSelectedReqId] = useState<string | null>(design.requirements[0]?.id ?? null)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const selectedReq = design.requirements.find((r) => r.id === selectedReqId) ?? null
  const features = useMemo(
    () => (selectedReq ? design.features.filter((f) => f.requirementIds.includes(selectedReq.id)) : []),
    [design.features, selectedReq]
  )

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>기능명세서</span>
        <div className={s.spacer} />
        <button className={s.pillSelect}>전체 보기</button>
        <button className={s.pillSelect}>상태</button>
        <button className={s.pillSelect}>사용자 역할</button>
        <button className={s.pillSelect}>중요도</button>
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
          <button className={s.railBtn} aria-label="검색">
            <SearchIcon />
          </button>
        </div>

        {specView === "dir" && (
          <DirectoryView
            requirements={design.requirements}
            features={features}
            selectedReq={selectedReq}
            selectedReqId={selectedReqId}
            selectedFeatureId={selectedFeatureId}
            checked={checked}
            onSelectReq={(id) => {
              setSelectedReqId(id)
              setSelectedFeatureId(null)
            }}
            onToggleCheck={toggleCheck}
            onSelectFeature={setSelectedFeatureId}
          />
        )}

        {specView === "doc" && <DocumentView requirements={design.requirements} features={design.features} />}

        {specView === "tree" && (
          <div className={s.emptyCol} style={{ flex: 1 }}>
            트리 뷰는 준비 중이에요. 디렉토리·도큐먼트 뷰에서 먼저 살펴볼 수 있어요.
          </div>
        )}
      </div>
    </section>
  )
}

// 행 안에 체크박스(중첩 인터랙티브)가 있어 <button> 대신 role 패턴 — 자식에서 버블된 키는 무시한다.
function rowKeyDown(e: KeyboardEvent<HTMLDivElement>, activate: () => void) {
  if (e.target !== e.currentTarget) return
  if (e.key !== "Enter" && e.key !== " ") return
  e.preventDefault()
  activate()
}

function DirectoryView({
  requirements,
  features,
  selectedReq,
  selectedReqId,
  selectedFeatureId,
  checked,
  onSelectReq,
  onToggleCheck,
  onSelectFeature,
}: {
  requirements: Requirement[]
  features: Feature[]
  selectedReq: Requirement | null
  selectedReqId: string | null
  selectedFeatureId: string | null
  checked: Set<string>
  onSelectReq: (id: string) => void
  onToggleCheck: (id: string) => void
  onSelectFeature: (id: string) => void
}) {
  return (
    <div className={s.miller}>
      {/* 요구사항 */}
      <div className={s.mcol}>
        <div className={s.mcolHead}>요구사항</div>
        <div className={s.mlist}>
          {requirements.length === 0 && <div className={s.emptyCol}>아직 요구사항이 없어요.</div>}
          {requirements.map((r, i) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              className={clsx(s.mrow, r.id === selectedReqId && s.mrowSel)}
              onClick={() => onSelectReq(r.id)}
              onKeyDown={(e) => rowKeyDown(e, () => onSelectReq(r.id))}
            >
              <input
                type="checkbox"
                aria-label={`${r.title} 선택`}
                checked={checked.has(r.id)}
                onChange={() => onToggleCheck(r.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className={s.idx}>{i + 1}</span>
              {r.title}
              <span className={r.priority === "high" ? s.starOn : s.star}>{r.priority === "high" ? "★" : "☆"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 기능 / 상세 기능 */}
      <div className={s.mcol}>
        <div className={s.mcolHead}>기능 / 상세 기능</div>
        <div className={s.mlist}>
          {features.length === 0 && <div className={s.emptyCol}>연결된 기능이 없어요.</div>}
          {features.map((f, i) => (
            <div
              key={f.id}
              role="button"
              tabIndex={0}
              className={clsx(s.mrow, f.id === selectedFeatureId && s.mrowSel)}
              onClick={() => onSelectFeature(f.id)}
              onKeyDown={(e) => rowKeyDown(e, () => onSelectFeature(f.id))}
            >
              <span className={s.idx}>{i + 1}</span>
              {f.name}
              <span className={s.chevr}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 */}
      <div className={clsx(s.mcol, s.mcolLast)}>
        <div className={s.mcolHead}>상세</div>
        {selectedReq ? (
          <div className={s.detail}>
            <div className={s.detailTop}>
              <div className={s.detailTitle}>{selectedReq.title}</div>
            </div>
            <div className={s.metaRow}>
              <span>
                ID <b>{selectedReq.id}</b>
              </span>
              <span>
                상태 <RequirementStatusPill status={selectedReq.status} />
              </span>
              <span>
                중요도 <PriorityBars priority={selectedReq.priority} />
              </span>
              {selectedReq.role && (
                <span>
                  역할 <b>{selectedReq.role}</b>
                </span>
              )}
            </div>

            <div className={s.detailSec}>
              <h4>설명</h4>
              <div className={s.detailDesc}>{selectedReq.description || "설명이 아직 없어요."}</div>
            </div>

            <div className={s.detailSec}>
              <h4>수용 기준</h4>
              {selectedReq.acceptanceCriteria.length === 0 && (
                <div className={s.emptyCol} style={{ padding: "4px 0" }}>
                  아직 수용 기준이 없어요.
                </div>
              )}
              {selectedReq.acceptanceCriteria.map((ac) => (
                <label className={s.ac} key={ac}>
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
              {features.map((f) => (
                <div className={s.fcard} key={f.id}>
                  <div className={s.fh}>
                    {f.name}
                    <span className={s.fid}>{f.id}</span>
                  </div>
                  <div className={s.fd}>{f.description}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={s.emptyCol}>요구사항을 선택하면 상세를 보여드릴게요.</div>
        )}
      </div>
    </div>
  )
}

function DocumentView({ requirements, features }: { requirements: Requirement[]; features: Feature[] }) {
  if (requirements.length === 0) {
    return <div className={s.emptyCol} style={{ flex: 1 }}>아직 문서로 보여줄 요구사항이 없어요.</div>
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

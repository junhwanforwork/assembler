"use client"

import { clsx } from "clsx"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore, type DocKind, type EditorView } from "@/lib/stores/useEditorStore"
import { usePolicyDocs } from "@/hooks/usePolicyDoc"
import { ApiListIcon, ChevronDown, DatabaseIcon } from "./icons"
import s from "./editor.module.css"

// 문서 패밀리(ASM-065) — "문서" 행 아래 상시 펼침 하위 3행. 라벨은 중앙 Segmented와 동일 어휘.
const DOC_FAMILY: { kind: DocKind; label: string }[] = [
  { kind: "prd", label: "PRD" },
  { kind: "tech", label: "기술 명세" },
  { kind: "data", label: "데이터 사전" },
]

// 좌 레일 첫 뎁스 = 설계 / 문서·md / 코드 진실 (2026-07-09 재정의, product-definition.md §4-1).
// 설계=원본 그래프(편집)·문서·md=repo 산출물(자동 투사 + 자유 저작)·코드 진실=API·DB(읽기 근거).
// 번호 대신 연결 수 뱃지(내용의 양). 챗은 하단 도크(ASM-018).
export function LeftRail({
  design,
  apis,
  dbTables,
}: {
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
}) {
  const activeView = useEditorStore((st) => st.activeView)
  const dataSeg = useEditorStore((st) => st.dataSeg)
  const docKind = useEditorStore((st) => st.docKind)
  const policySelectedId = useEditorStore((st) => st.policySelectedId)
  const workspaceId = useEditorStore((st) => st.currentWorkspaceId)
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const setDocKind = useEditorStore((st) => st.setDocKind)
  const openData = useEditorStore((st) => st.openData)
  const openPolicy = useEditorStore((st) => st.openPolicy)

  // 정책 문서 목록(ASM-069) — 브리지 공유 store. 중앙 편집 뷰와 같은 목록·같은 선택을 본다.
  const { docs: policyDocs } = usePolicyDocs(workspaceId)

  // 첫 뎁스 = 설계 / 문서·md / 코드 진실 (2026-07-09 재정의, product-definition.md §4-1).
  // 설계(원본 그래프·편집): 기능이 홈(허브) + 사용자 플로우. 행마다 단위가 달라 라벨에 명시(X-08).
  // 와이어프레임(화면 안)은 later(ASM-052 휴면).
  const designAngles: { view: EditorView; label: string; unit: string; count: number }[] = [
    { view: "spec", label: "기능", unit: "기능", count: design.features.length },
    { view: "flow", label: "사용자 플로우", unit: "화면", count: design.pages.length },
  ]

  return (
    <aside className={s.left}>
      <div className={s.leftPane}>
        <div className={s.tree}>
          {/* ── 설계 (원본 그래프 · 편집) ── */}
          <div className={s.treeGroupHead}>설계</div>
          {designAngles.map((a) => (
            <button
              key={a.view}
              className={clsx(s.trow, activeView === a.view && s.trowActive)}
              aria-label={`${a.label} — ${a.unit} ${a.count}개`}
              onClick={() => setActiveView(a.view)}
            >
              {a.label}
              <span className={s.tcount} title={`${a.unit} ${a.count}개`} aria-hidden>
                {a.count}
              </span>
            </button>
          ))}

          <div className={s.treeDivider} />
          {/* ── 문서·md (자동 투사 + 자유 저작 · repo에 올라가는 것) ── */}
          <div className={s.treeGroupHead}>문서·md</div>
          {/* 자동 문서(투사·읽기전용): 그래프 절단면. 하위 3행 상시 펼침. */}
          <button
            className={s.trow}
            aria-label={`문서 — 요구사항 ${design.requirements.length}개`}
            onClick={() => setActiveView("doc")}
          >
            <ChevronDown aria-hidden />
            문서
            <span className={s.tcount} title={`요구사항 ${design.requirements.length}개`} aria-hidden>
              {design.requirements.length}
            </span>
          </button>
          {DOC_FAMILY.map((d) => (
            <button
              key={d.kind}
              className={clsx(s.trow, s.trowSub, activeView === "doc" && docKind === d.kind && s.trowActive)}
              aria-current={(activeView === "doc" && docKind === d.kind) || undefined}
              onClick={() => {
                setActiveView("doc")
                setDocKind(d.kind)
              }}
            >
              {d.label}
            </button>
          ))}
          {/* 자유 저작 문서(정책 등, 한 종류): add/수정/삭제. */}
          {policyDocs.map((d) => {
            const active = activeView === "policy" && policySelectedId === d.id
            return (
              <button
                key={d.id}
                className={clsx(s.trow, s.trowSub, active && s.trowActive)}
                aria-current={active || undefined}
                onClick={() => openPolicy(d.id)}
              >
                {d.title || "제목 없음"}
              </button>
            )
          })}
          <button
            className={clsx(s.trow, s.trowSub, activeView === "policy" && policySelectedId === null && s.trowActive)}
            aria-current={(activeView === "policy" && policySelectedId === null) || undefined}
            onClick={() => openPolicy(null)}
          >
            ＋ 새 문서
          </button>

          <div className={s.treeDivider} />
          {/* ── 코드 진실 (읽기 · 그래프·문서의 근거) ── */}
          <div className={s.treeGroupHead}>코드 진실</div>
          <button
            className={clsx(s.trow, activeView === "data" && dataSeg === "db" && s.trowActive)}
            aria-label={`DB — 테이블 ${dbTables.length}개`}
            onClick={() => openData("db")}
          >
            <DatabaseIcon />
            DB
            <span className={s.tcount} title={`테이블 ${dbTables.length}개`} aria-hidden>
              {dbTables.length}
            </span>
          </button>
          <button
            className={clsx(s.trow, activeView === "data" && dataSeg === "api" && s.trowActive)}
            aria-label={`API — 엔드포인트 ${apis.length}개`}
            onClick={() => openData("api")}
          >
            <ApiListIcon />
            API
            <span className={s.tcount} title={`엔드포인트 ${apis.length}개`} aria-hidden>
              {apis.length}
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

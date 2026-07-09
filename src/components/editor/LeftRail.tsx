"use client"

import { Fragment } from "react"
import { clsx } from "clsx"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore, type DocKind, type EditorView } from "@/lib/stores/useEditorStore"
import { ApiListIcon, ChevronDown, DatabaseIcon } from "./icons"
import s from "./editor.module.css"

// 문서 패밀리(ASM-065) — "문서" 행 아래 상시 펼침 하위 3행. 라벨은 중앙 Segmented와 동일 어휘.
const DOC_FAMILY: { kind: DocKind; label: string }[] = [
  { kind: "prd", label: "PRD" },
  { kind: "tech", label: "기술 명세" },
  { kind: "data", label: "데이터 사전" },
]

// 좌측 "제품 구조" — 스펙 모델을 보는 각도 목록(화면 언어 = 모델 언어, C-1).
// AI 챗 토글은 폐지(#12) — 챗은 하단 도크(ASM-018). 번호 대신 연결 수 뱃지(내용의 양을 보여준다).
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
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const setDocKind = useEditorStore((st) => st.setDocKind)
  const openData = useEditorStore((st) => st.openData)

  // 각 각도의 "1급 객체" 수 — 행마다 단위가 다르므로 단위를 라벨로 명시한다(X-08). design에서 파생.
  // 와이어프레임 행은 후퇴(ASM-052) — 문서 중심 전환으로 화면 각도는 later phase.
  const angles: { view: EditorView; label: string; unit: string; count: number }[] = [
    { view: "doc", label: "문서", unit: "요구사항", count: design.requirements.length },
    { view: "spec", label: "기능명세서", unit: "기능", count: design.features.length },
    { view: "flow", label: "유저플로우", unit: "화면", count: design.pages.length },
  ]

  return (
    <aside className={s.left}>
      <div className={s.leftPane}>
        <div className={s.tree}>
          <div className={s.treeGroupHead}>제품 구조</div>

          {angles.map((a) => (
            <Fragment key={a.view}>
              <button
                // 문서 행의 활성 표시는 하위행이 대신한다(docKind가 항상 하나를 비추므로 이중 강조 회피).
                className={clsx(s.trow, a.view !== "doc" && activeView === a.view && s.trowActive)}
                aria-label={`${a.label} — ${a.unit} ${a.count}개`}
                onClick={() => setActiveView(a.view)}
              >
                {a.view === "doc" && <ChevronDown aria-hidden />}
                {a.label}
                <span className={s.tcount} title={`${a.unit} ${a.count}개`} aria-hidden>
                  {a.count}
                </span>
              </button>
              {a.view === "doc" &&
                DOC_FAMILY.map((d) => (
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
            </Fragment>
          ))}

          <div className={s.treeDivider} />
          {/* 출처(코드 자동 유입) 명시는 인스펙터 상세에만(C-3) — 여기선 그룹명만("제품 구조"와 같은 문법). */}
          <div className={s.treeGroupHead}>공통</div>

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

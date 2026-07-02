"use client"

import { clsx } from "clsx"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore, type EditorView } from "@/lib/stores/useEditorStore"
import { ApiListIcon, DatabaseIcon } from "./icons"
import s from "./editor.module.css"

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
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const openData = useEditorStore((st) => st.openData)

  // 각 각도가 담고 있는 객체 수 — 하드코딩 금지, design에서 파생.
  const angles: { view: EditorView; label: string; count: number }[] = [
    { view: "doc", label: "문서", count: design.requirements.length },
    { view: "spec", label: "기능명세서", count: design.features.length },
    { view: "flow", label: "유저플로우", count: design.flows.reduce((n, f) => n + f.edges.length, 0) },
    { view: "wire", label: "와이어프레임", count: design.pages.length },
  ]

  return (
    <aside className={s.left}>
      <div className={s.leftPane}>
        <div className={s.tree}>
          <div className={s.treeGroupHead}>제품 구조</div>

          {angles.map((a) => (
            <button
              key={a.view}
              className={clsx(s.trow, activeView === a.view && s.trowActive)}
              onClick={() => setActiveView(a.view)}
            >
              {a.label}
              <span className={s.tcount}>{a.count}</span>
            </button>
          ))}

          <div className={s.treeDivider} />
          {/* 출처(코드 자동 유입) 명시는 인스펙터 상세에만(C-3) — 여기선 그룹명만. */}
          <div className={s.tcommon}>공통</div>

          <button
            className={clsx(s.trow, activeView === "data" && dataSeg === "db" && s.trowActive)}
            onClick={() => openData("db")}
          >
            <DatabaseIcon />
            DB
            <span className={s.tcount}>{dbTables.length}</span>
          </button>
          <button
            className={clsx(s.trow, activeView === "data" && dataSeg === "api" && s.trowActive)}
            onClick={() => openData("api")}
          >
            <ApiListIcon />
            API
            <span className={s.tcount}>{apis.length}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

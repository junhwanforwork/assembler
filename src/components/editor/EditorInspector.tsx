"use client"

import { useState } from "react"
import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { buildTableDetail } from "./views/dataUtils"
import { DbTableNoteCard } from "./DbTableNoteCard"
import { ChevronRightIcon } from "./icons"
import s from "./editor.module.css"

// 우측 단일 컨텍스트 패널 — [정보 / 코멘트]. 정보 = 선택한 테이블 상세(데이터 뷰).
export function EditorInspector({
  workspace,
  design,
  apis,
  dbTables,
}: {
  workspace: Workspace
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
}) {
  const [seg, setSeg] = useState<"info" | "comments">("info")
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const selectedTable = useEditorStore((st) => st.selectedTable)
  const activeView = useEditorStore((st) => st.activeView)

  const table = activeView === "data" && selectedTable ? dbTables.find((t) => t.id === selectedTable) : undefined

  return (
    <aside className={s.right}>
      <div className={s.rightHead}>
        <div className={s.rseg}>
          <button
            className={clsx(s.rsegBtn, seg === "info" && s.rsegBtnActive)}
            onClick={() => setSeg("info")}
          >
            정보
          </button>
          <button
            className={clsx(s.rsegBtn, seg === "comments" && s.rsegBtnActive)}
            onClick={() => setSeg("comments")}
          >
            코멘트
          </button>
        </div>
        <button className={s.iconBtn} style={{ marginLeft: "auto" }} onClick={toggleRight} aria-label="패널 접기">
          <ChevronRightIcon />
        </button>
      </div>

      <div className={s.rightBody}>
        {seg === "comments" ? (
          <div className={s.inspEmpty}>
            선택한 아이템에 코멘트를 남길 수 있어요.
            <br />
            아직 남긴 코멘트가 없어요.
          </div>
        ) : table ? (
          <TableInspector table={table} apis={apis} design={design} workspaceId={workspace.id} />
        ) : (
          <div className={s.inspEmpty}>
            항목을 선택하면 정보를 보여드릴게요.
            <br />
            데이터 뷰의 관계도에서 테이블을 눌러보세요.
          </div>
        )}
      </div>
    </aside>
  )
}

function TableInspector({ table, apis, design, workspaceId }: { table: DbTable; apis: Api[]; design: WorkspaceDesign; workspaceId: string }) {
  const d = buildTableDetail(table, apis, design)
  return (
    <div className={s.insp}>
      <div className={s.inspTitle}>{d.name}</div>
      <div className={s.inspSub}>DB 테이블 · 읽기전용·git</div>

      <div className={s.inspSec}>
        <div className={s.inspH}>무엇을 하나요</div>
        <div className={s.inspV}>{d.role || "설명이 아직 없어요."}</div>
      </div>

      {/* AI 설명 — code-truth 섹션 아래, 'AI 추정' 배지로 추론 레이어 분리 (key=table.id로 선택 변경 시 리셋). */}
      <DbTableNoteCard key={table.id} workspaceId={workspaceId} tableId={table.id} />
      <div className={s.inspSec}>
        <div className={s.inspH}>컬럼</div>
        <div className={clsx(s.inspV, s.inspCols)}>{d.cols.join(" · ")}</div>
      </div>
      <div className={s.inspSec}>
        <div className={s.inspH}>이 테이블을 쓰는 곳</div>
        <div className={s.inspV}>
          {d.usedBy.length > 0 ? d.usedBy.map((u, i) => <span key={i} className={s.reltag}>{u}</span>) : "—"}
        </div>
      </div>
      <div className={s.inspSec}>
        <div className={s.inspH}>관련 API</div>
        <div className={s.inspV}>
          {d.apis.length > 0 ? d.apis.map((a, i) => <span key={i} className={s.reltag}>{a}</span>) : "—"}
        </div>
      </div>
    </div>
  )
}

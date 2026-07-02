"use client"

import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { IconButton } from "@/components/ui/Button"
import { Tooltip } from "@/components/ui/Tooltip"
import { buildTableDetail } from "./views/dataUtils"
import { DbTableNoteCard } from "./DbTableNoteCard"
import { SpecInspector } from "./InspectorSpecPanels"
import { ChevronRightIcon } from "./icons"
import s from "./editor.module.css"

// 공용 인스펙터(ASM-017) — 전 뷰의 선택 상세가 사는 단일 집(A-11).
// 마지막 선택(inspected)이 명세든 테이블이든, 어느 뷰에 있든 여기서 보여준다.
export function RightPanel({
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
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const selectedTable = useEditorStore((st) => st.selectedTable)
  const inspected = useEditorStore((st) => st.inspected)

  const table = selectedTable ? dbTables.find((t) => t.id === selectedTable) : undefined

  return (
    <aside className={s.right}>
      <div className={s.rightHead}>
        <div className={s.rseg}>
          <button className={clsx(s.rsegBtn, s.rsegBtnActive)}>정보</button>
          {/* 코멘트는 미배선(#8) — 기능 약속 카피 대신 disabled + 사유(C-9). */}
          <Tooltip content="코멘트는 준비 중이에요. 곧 열어드릴게요." width={200}>
            <button className={s.rsegBtn} disabled>
              코멘트
            </button>
          </Tooltip>
        </div>
        <IconButton label="패널 접기" className={s.spacer} onClick={toggleRight}>
          <ChevronRightIcon />
        </IconButton>
      </div>

      <div className={s.rightBody}>
        {inspected === "table" && table ? (
          <TableInspector table={table} apis={apis} design={design} workspaceId={workspace.id} />
        ) : inspected === "spec" ? (
          <SpecInspector design={design} />
        ) : (
          <div className={s.inspEmpty}>
            항목을 선택하면 정보를 보여드릴게요.
            <br />
            명세의 요구사항·기능이나 데이터 뷰의 테이블을 눌러보세요.
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
      {/* 출처는 인스펙터 상세에만 명시(C-3) — "git 동기" 같은 미구현 약속 라벨 금지. */}
      <div className={s.inspSub}>DB 테이블 · 코드에서 자동으로 와요</div>

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
          {d.usedBy.length > 0 ? d.usedBy.map((u) => <span key={u} className={s.reltag}>{u}</span>) : "—"}
        </div>
      </div>
      <div className={s.inspSec}>
        <div className={s.inspH}>관련 API</div>
        <div className={s.inspV}>
          {d.apis.length > 0 ? d.apis.map((a) => <span key={a} className={s.reltag}>{a}</span>) : "—"}
        </div>
      </div>
    </div>
  )
}

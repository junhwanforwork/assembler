"use client"

import { clsx } from "clsx"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { IconButton } from "@/components/ui/Button"
import { Segmented, SegmentedButton, SegmentedLabel } from "@/components/ui/Segmented"
import { Tooltip } from "@/components/ui/Tooltip"
import { buildTableDetail } from "./views/dataUtils"
import { DbTableNoteCard } from "./DbTableNoteCard"
import { SpecInspector } from "./InspectorSpecPanels"
import { SuggestionsCard } from "./SuggestionsCard"
import { ChevronRightIcon } from "./icons"
import s from "./editor.module.css"

// 공용 인스펙터(ASM-017) — 전 뷰의 선택 상세가 사는 단일 집(A-11).
// 마지막 선택(inspected)이 명세든 테이블이든, 어느 뷰에 있든 여기서 보여준다.
export function RightPanel({
  workspace,
  design,
  apis,
  dbTables,
  onDesignChange,
}: {
  workspace: Workspace
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  onDesignChange: (design: WorkspaceDesign) => void
}) {
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const selectedTable = useEditorStore((st) => st.selectedTable)
  const inspected = useEditorStore((st) => st.inspected)

  // 사라진 id(테이블 싱크 삭제 등)는 여기서 걸러진다 — 못 찾으면 spec 인스펙터로 자연 폴백.
  const table = selectedTable ? dbTables.find((t) => t.id === selectedTable) : undefined

  return (
    <aside className={s.right}>
      <div className={s.rightHead}>
        <Segmented tone="card" aria-label="인스펙터 보기">
          {/* 세그가 하나뿐인 동안 "정보"는 정적 라벨 — 무반응 버튼을 두지 않는다. */}
          <SegmentedLabel active>정보</SegmentedLabel>
          {/* 코멘트는 미배선(#8) — 사유 툴팁(C-9). aria-disabled로 포커스를 유지해 키보드로도 사유에 닿는다. */}
          <Tooltip content="코멘트는 준비 중이에요. 곧 열어드릴게요." width={200}>
            <SegmentedButton aria-disabled="true">코멘트</SegmentedButton>
          </Tooltip>
        </Segmented>
        <IconButton label="패널 접기" className={s.spacer} onClick={toggleRight}>
          <ChevronRightIcon />
        </IconButton>
      </div>

      <div className={s.rightBody}>
        {inspected === "table" && table ? (
          <TableInspector table={table} apis={apis} design={design} workspaceId={workspace.id} />
        ) : (
          <SpecInspector design={design} workspaceId={workspace.id} onDesignChange={onDesignChange} />
        )}
        {/* suggestions 카드(ASM-023) — 인스펙터 분기 밖에 상주. 분기 전환(테이블↔명세)으로
            언마운트되면 유료 AI 분석 결과가 유실되므로 어떤 인스펙션 상태에서도 마운트를 유지한다. */}
        <SuggestionsCard workspaceId={workspace.id} design={design} />
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

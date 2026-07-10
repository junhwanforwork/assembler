"use client"

import { clsx } from "clsx"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { buildTableDetail } from "./views/dataUtils"
import { DbTableNoteCard } from "./DbTableNoteCard"
import s from "./editor.module.css"

// 테이블 상세 인스펙터(ASM-080) — 삭제된 도킹 우패널(RightPanel)에서 추출. 이제 상세 플로팅 창(DetailOverlay)이
// inspected==="table"일 때 렌더한다. code-truth(컬럼·관계·API) 위에 AI 설명(DbTableNoteCard)을 얹는다(로직 불변).
export function TableInspector({ table, apis, design, workspaceId }: { table: DbTable; apis: Api[]; design: WorkspaceDesign; workspaceId: string }) {
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

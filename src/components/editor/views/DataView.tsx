"use client"

import { useMemo, useState } from "react"
import type { KeyboardEvent } from "react"
import { clsx } from "clsx"
import type { Api, DbColumn, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { TYPOGRAPHY } from "@/lib/design-tokens"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge, methodTone } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Segmented, SegmentedButton } from "@/components/ui/Segmented"
import { Tooltip } from "@/components/ui/Tooltip"
import { errorMessage } from "@/lib/api/messages"
import { useApiNote } from "@/hooks/useApiNote"
import { ApiNoteTip } from "../ApiNoteTip"
import { StatusPill } from "./Badges"
import { apiStatusLabel, apiUsage, erEdgePath, ER_NODE_W, layoutEr, refTableName, sourceLabel } from "./dataUtils"
import { DatabaseMiniIcon, LockIcon } from "../icons"
import s from "../editor.module.css"

// 데이터(전역 DB·API) — 실데이터. 코드에서 자동 유입되는 읽기 전용 레이어(code-truth).
export function DataView({ design, apis, dbTables }: { design: WorkspaceDesign; apis: Api[]; dbTables: DbTable[] }) {
  const dataSeg = useEditorStore((st) => st.dataSeg)
  const setDataSeg = useEditorStore((st) => st.setDataSeg)
  const [dbView, setDbView] = useState<"er" | "table">("er")

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>데이터</span>
        <span className={s.muted} style={{ fontSize: TYPOGRAPHY.SIZE_META }}>
          · 전체 프로덕트
        </span>
        {/* "git 동기" 거짓 라벨 정정(C-3) — 미구현 기능 약속 금지, 사실(읽기 전용)만. */}
        <span className={clsx(s.gitBadge, s.spacer)}>
          <LockIcon /> 읽기 전용
        </span>
      </div>

      <div className={s.dataToolbar}>
        <Segmented tone="elevated" aria-label="데이터 종류">
          <SegmentedButton active={dataSeg === "api"} onClick={() => setDataSeg("api")}>
            API
          </SegmentedButton>
          <SegmentedButton active={dataSeg === "db"} onClick={() => setDataSeg("db")}>
            데이터베이스
          </SegmentedButton>
        </Segmented>
      </div>

      <div className={s.readonlyNote}>
        <LockIcon /> 코드에서 자동으로 오는 정보예요. 여기서는 편집할 수 없어요.
      </div>

      <div className={s.dataBody}>
        {dataSeg === "api" ? (
          <ApiTable apis={apis} design={design} />
        ) : (
          <>
            <div className={s.dbviewBar}>
              <Segmented tone="elevated" aria-label="데이터베이스 보기">
                <SegmentedButton active={dbView === "er"} onClick={() => setDbView("er")}>
                  관계도
                </SegmentedButton>
                <SegmentedButton active={dbView === "table"} onClick={() => setDbView("table")}>
                  테이블
                </SegmentedButton>
              </Segmented>
            </div>
            {dbView === "er" ? <ErDiagram dbTables={dbTables} /> : <DbTableList dbTables={dbTables} />}
          </>
        )}
      </div>
    </section>
  )
}

function ApiTable({ apis, design }: { apis: Api[]; design: WorkspaceDesign }) {
  // API 해석(ASM-064) 배선용 — enterWorkspace가 기록. null(미설정)이면 유료 트리거·호버 해석을 숨긴다(정직).
  const workspaceId = useEditorStore((st) => st.currentWorkspaceId)

  if (apis.length === 0) {
    return <div className={s.emptyCol}>아직 들어온 API가 없어요. 코드에서 자동으로 들어오면 여기에 보여드릴게요.</div>
  }
  return (
    <table className={s.tbl}>
      <thead>
        <tr>
          <th>무엇을 하나요</th>
          <th>기능(API)</th>
          <th>상태</th>
          <th>어디서 써요</th>
          <th>출처</th>
        </tr>
      </thead>
      <tbody>
        {apis.map((api) => {
          const st = apiStatusLabel(api.status)
          const usage = apiUsage(api.id, design)
          return (
            <tr key={api.id}>
              <td className={s.sec}>
                <ApiSummaryCell api={api} workspaceId={workspaceId} />
              </td>
              <td>
                <Badge variant="method" tone={methodTone(api.method)}>{api.method}</Badge>{" "}
                {workspaceId ? (
                  // 호버 해석(GET 전용·무료) — 노트 > code-truth 요약 > "설명이 아직 없어요."
                  <ApiNoteTip workspaceId={workspaceId} apiId={api.id} fallbackSummary={api.summary || undefined}>
                    <span className={s.mono} tabIndex={0}>{api.endpoint}</span>
                  </ApiNoteTip>
                ) : (
                  <span className={s.mono}>{api.endpoint}</span>
                )}
              </td>
              <td>
                <StatusPill tone={st.tone} label={st.label} />
              </td>
              <td className={s.sec}>{usage.length > 0 ? usage.join(", ") : "—"}</td>
              <td>
                <span className={s.src}>{sourceLabel(api.source)}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// "무엇을 하나요" 셀(ASM-064) — 노트 요약(추론, 'AI 추정' 배지 동반) > code-truth summary > 명시 생성 버튼.
// 생성(유료 haiku)은 이 버튼 클릭만 — 자동 발사 경로 없음(ASM-048 원칙). workspaceId 미설정이면 버튼 숨김(정직).
function ApiSummaryCell({ api, workspaceId }: { api: Api; workspaceId: string | null }) {
  if (!workspaceId) return <>{api.summary || "—"}</>
  return <ApiSummaryCellBody api={api} workspaceId={workspaceId} />
}

function ApiSummaryCellBody({ api, workspaceId }: { api: Api; workspaceId: string }) {
  const { note, status, error, generate } = useApiNote(workspaceId, api.id)

  if (note) {
    return (
      <>
        {note.explanation}{" "}
        {/* 셀은 사실(code-truth) 칸이라 추론임을 항상 표시한다 — 구조/설명 분리(F5 문법). */}
        <Badge variant="status" tone="brand">AI 추정</Badge>
      </>
    )
  }
  // code-truth 요약이 있으면 그대로(사실 우선) — 노트 로딩 중에도 빈 칸 대신 요약을 보여준다.
  if (api.summary) return <>{api.summary}</>
  if (status === "loading") return <>—</>
  return (
    <>
      {status === "error" && <span className={s.src}>{errorMessage(error)} </span>}
      <Button variant="ghost" size="sm" onClick={generate} loading={status === "generating"}>
        해석 만들기
      </Button>
    </>
  )
}

function DbTableList({ dbTables }: { dbTables: DbTable[] }) {
  if (dbTables.length === 0) {
    return <div className={s.emptyCol}>아직 들어온 테이블이 없어요. 코드에서 자동으로 들어오면 여기에 보여드릴게요.</div>
  }
  return (
    <table className={s.tbl}>
      <thead>
        <tr>
          <th>무엇을 담는 곳</th>
          <th>테이블</th>
          <th>주요 컬럼</th>
          <th>출처</th>
        </tr>
      </thead>
      <tbody>
        {dbTables.map((t) => (
          <tr key={t.id}>
            <td className={s.sec}>{t.description}</td>
            <td className={s.mono}>{t.name}</td>
            <td className={s.sec}>{t.columns.map((c) => c.name).join(" · ")}</td>
            <td>
              <span className={s.src}>{sourceLabel(t.source)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ErColumn({ col }: { col: DbColumn }) {
  return (
    <div className={s.erCol}>
      {col.name}
      {col.isPrimaryKey && <Badge variant="tag" tone="brand" className={s.erColTag}>PK</Badge>}
      {col.references && <Badge variant="tag" tone="positive" className={s.erColTag}>→ {refTableName(col.references)}</Badge>}
    </div>
  )
}

function ErDiagram({ dbTables }: { dbTables: DbTable[] }) {
  const selectedTable = useEditorStore((st) => st.selectedTable)
  const setSelectedTable = useEditorStore((st) => st.setSelectedTable)
  const openDetailOverlay = useEditorStore((st) => st.openDetailOverlay)

  const { nodes, edges, width, height } = useMemo(() => layoutEr(dbTables), [dbTables])

  if (dbTables.length === 0) {
    return <div className={s.emptyCol}>아직 들어온 테이블이 없어요. 코드에서 자동으로 들어오면 여기에 보여드릴게요.</div>
  }

  // 테이블 클릭 → 상세 플로팅 창을 연다(ASM-080). setSelectedTable이 inspected='table'을 함께 세팅해
  // DetailOverlay가 TableInspector를 렌더한다. (우패널 삭제 — 상세 표면은 플로팅 하나로 통일.)
  const selectTable = (table: DbTable) => {
    setSelectedTable(table.id)
    openDetailOverlay()
  }

  const nodeKeyDown = (e: KeyboardEvent<HTMLDivElement>, table: DbTable) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    selectTable(table)
  }

  return (
    <div className={s.er} style={{ width: "100%", height, minHeight: height }}>
      <svg className={s.erEdges} width={width} height={height}>
        {edges.map((edge) => (
          <path key={edge.id} d={erEdgePath(edge)} fill="none" stroke="var(--positive)" strokeWidth={1.4} />
        ))}
      </svg>

      {/* 툴팁은 설명만 — 테이블명은 바로 위 노드 헤더와 중복이라 뺀다(가림 높이도 줄인다). */}
      {nodes.map((node) => (
        <Tooltip
          key={node.table.id}
          width={264}
          content={<div className={s.tipRole}>{node.table.description || "설명이 아직 없어요."}</div>}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label={`${node.table.name} 테이블 상세 보기`}
            className={clsx(s.erNode, selectedTable === node.table.id && s.erNodeSel)}
            style={{ left: node.x, top: node.y, width: ER_NODE_W }}
            onClick={() => selectTable(node.table)}
            onKeyDown={(e) => nodeKeyDown(e, node.table)}
          >
            <div className={s.erH}>
              <DatabaseMiniIcon />
              {node.table.name}
            </div>
            {node.table.columns.map((col) => (
              <ErColumn key={col.name} col={col} />
            ))}
          </div>
        </Tooltip>
      ))}

      <div className={s.erLegend}>
        <span>
          <i />
          FK(연결) 관계
        </span>
        <span>· 코드에서 자동으로 와요 · 읽기 전용</span>
      </div>

    </div>
  )
}

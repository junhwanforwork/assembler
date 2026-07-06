"use client"

import { useMemo, useState } from "react"
import type { KeyboardEvent } from "react"
import { clsx } from "clsx"
import type { Api, DbColumn, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { TYPOGRAPHY } from "@/lib/design-tokens"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge, methodTone } from "@/components/ui/Badge"
import { Segmented, SegmentedButton } from "@/components/ui/Segmented"
import { Tooltip } from "@/components/ui/Tooltip"
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
              <td className={s.sec}>{api.summary}</td>
              <td>
                <Badge variant="method" tone={methodTone(api.method)}>{api.method}</Badge>{" "}
                <span className={s.mono}>{api.endpoint}</span>
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
  const setRightCollapsed = useEditorStore((st) => st.setRightCollapsed)

  const { nodes, edges, width, height } = useMemo(() => layoutEr(dbTables), [dbTables])

  if (dbTables.length === 0) {
    return <div className={s.emptyCol}>아직 들어온 테이블이 없어요. 코드에서 자동으로 들어오면 여기에 보여드릴게요.</div>
  }

  const selectTable = (table: DbTable) => {
    setSelectedTable(table.id)
    setRightCollapsed(false)
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

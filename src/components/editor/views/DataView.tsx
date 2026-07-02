"use client"

import { useMemo, useState, type MouseEvent } from "react"
import type { KeyboardEvent } from "react"
import { clsx } from "clsx"
import type { Api, DbColumn, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Badge, methodTone } from "@/components/ui/Badge"
import { StatusPill } from "./Badges"
import { apiStatusLabel, apiUsage, erEdgePath, ER_NODE_W, layoutEr, refTableName, sourceLabel } from "./dataUtils"
import { DatabaseMiniIcon, GitIcon, LockIcon } from "../icons"
import s from "../editor.module.css"

// 데이터(전역 DB·API) — 실데이터. 읽기전용·git 동기.
export function DataView({ design, apis, dbTables }: { design: WorkspaceDesign; apis: Api[]; dbTables: DbTable[] }) {
  const dataSeg = useEditorStore((st) => st.dataSeg)
  const setDataSeg = useEditorStore((st) => st.setDataSeg)
  const [dbView, setDbView] = useState<"er" | "table">("er")

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>데이터</span>
        <span className={s.muted} style={{ fontSize: 12 }}>
          · 전체 프로덕트
        </span>
        <span className={clsx(s.gitBadge, s.spacer)}>
          <GitIcon /> git에서만 업데이트
        </span>
      </div>

      <div className={s.dataToolbar}>
        <div className={s.floatTabs}>
          <button className={clsx(s.ftab, dataSeg === "api" && s.ftabActive)} onClick={() => setDataSeg("api")}>
            API
          </button>
          <button className={clsx(s.ftab, dataSeg === "db" && s.ftabActive)} onClick={() => setDataSeg("db")}>
            데이터베이스
          </button>
        </div>
      </div>

      <div className={s.readonlyNote}>
        <LockIcon /> 코드-진실이에요. Assembler에서 편집할 수 없고 git 동기로만 갱신돼요.
      </div>

      <div className={s.dataBody}>
        {dataSeg === "api" ? (
          <ApiTable apis={apis} design={design} />
        ) : (
          <>
            <div className={s.dbviewBar}>
              <button className={clsx(s.ftab, dbView === "er" && s.ftabActive)} onClick={() => setDbView("er")}>
                관계도
              </button>
              <button className={clsx(s.ftab, dbView === "table" && s.ftabActive)} onClick={() => setDbView("table")}>
                테이블
              </button>
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
    return <div className={s.emptyCol}>아직 동기된 API가 없어요. 코드에서 git 동기를 하면 여기에 나타나요.</div>
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
    return <div className={s.emptyCol}>아직 동기된 테이블이 없어요. 코드에서 git 동기를 하면 여기에 나타나요.</div>
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
  const [tip, setTip] = useState<{ name: string; role: string; x: number; y: number } | null>(null)

  if (dbTables.length === 0) {
    return <div className={s.emptyCol}>아직 동기된 테이블이 없어요. 코드에서 git 동기를 하면 여기에 나타나요.</div>
  }

  const onEnter = (e: MouseEvent, table: DbTable) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const left = r.right + 12 + 264 > window.innerWidth ? r.left - 264 - 12 : r.right + 12
    setTip({ name: table.name, role: table.description, x: Math.max(8, left), y: r.top })
  }

  const selectTable = (table: DbTable) => {
    setSelectedTable(table.id)
    setRightCollapsed(false)
    setTip(null)
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

      {nodes.map((node) => (
        <div
          key={node.table.id}
          role="button"
          tabIndex={0}
          aria-label={`${node.table.name} 테이블 상세 보기`}
          className={clsx(s.erNode, selectedTable === node.table.id && s.erNodeSel)}
          style={{ left: node.x, top: node.y, width: ER_NODE_W }}
          onMouseEnter={(e) => onEnter(e, node.table)}
          onMouseLeave={() => setTip(null)}
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
      ))}

      <div className={s.erLegend}>
        <span>
          <i />
          FK(연결) 관계
        </span>
        <span>· 모두 git 동기 · 읽기전용</span>
      </div>

      {tip && (
        <div className={s.erTip} style={{ left: tip.x, top: tip.y }}>
          <div className={s.tipName}>
            <DatabaseMiniIcon />
            {tip.name}
          </div>
          <div className={s.tipRole}>{tip.role || "설명이 아직 없어요."}</div>
        </div>
      )}
    </div>
  )
}

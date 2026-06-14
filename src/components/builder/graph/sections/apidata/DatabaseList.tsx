"use client"

import { type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { databaseUsedBy } from "@/lib/graph/selectors"
import { Button } from "@/components/ui"
import { CommittingTextInput } from "@/components/builder/inspector/CommittingField"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { EditorCard } from "../../shared/EditorCard"
import { StringListEditor } from "../../shared/StringListEditor"

// Database 인라인 편집 — name/purpose/columns + 추가/삭제 (ASS-036).
export const DatabaseList: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const addDatabase = useGraphStore((s) => s.addDatabase)
  const updateDatabase = useGraphStore((s) => s.updateDatabase)
  const removeDatabase = useGraphStore((s) => s.removeDatabase)
  if (!graph) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      {graph.databases.map((d) => {
        const used = databaseUsedBy(graph, d.id)
        return (
          <EditorCard key={d.id} deleteLabel={`테이블 ${d.name} 삭제`} onDelete={() => removeDatabase(d.id)}>
            <CommittingTextInput
              key={d.id}
              value={d.name}
              onCommit={(v) => updateDatabase(d.id, { name: v })}
              placeholder="table_name (snake_case)"
              size="sm"
              ariaLabel="테이블 이름"
            />
            <CommittingTextInput
              key={`${d.id}-purpose`}
              value={d.purpose}
              onCommit={(v) => updateDatabase(d.id, { purpose: v })}
              placeholder="이 테이블의 목적"
              size="sm"
              ariaLabel="테이블 목적"
            />
            <p style={SUBLABEL}>컬럼</p>
            <StringListEditor
              seedKey={d.id}
              items={d.columns}
              onChange={(columns) => updateDatabase(d.id, { columns })}
              placeholder="컬럼명 — 설명 (예: email — 로그인 식별자)"
              addLabel="컬럼 추가하기"
              itemNoun="컬럼"
            />
            <p style={META}>기능 {used.featureIds.length} · API {used.apiIds.length}에서 참조</p>
          </EditorCard>
        )
      })}
      <div>
        <Button variant="ghost" size="sm" onClick={() => addDatabase()}>
          테이블 추가하기
        </Button>
      </div>
    </div>
  )
}

const SUBLABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: `${SPACING["1"]} 0 0` }
const META: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: 0 }

"use client"

import { useState, type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { apiUsedBy } from "@/lib/graph/selectors"
import { API_METHODS, type ApiMethod } from "@/lib/types/assembler"
import { Button, Dropdown, DropdownTrigger, DropdownItem } from "@/components/ui"
import { CommittingTextInput } from "@/components/builder/inspector/CommittingField"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { EditorCard } from "../../shared/EditorCard"

// API 인라인 편집 — method/path/purpose/success/error + 추가/삭제 (ASS-036).
export const ApiList: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const addApi = useGraphStore((s) => s.addApi)
  const updateApi = useGraphStore((s) => s.updateApi)
  const removeApi = useGraphStore((s) => s.removeApi)
  if (!graph) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      {graph.apis.map((a) => {
        const used = apiUsedBy(graph, a.id)
        return (
          <EditorCard key={a.id} deleteLabel={`API ${a.method} ${a.path} 삭제`} onDelete={() => removeApi(a.id)}>
            <div style={{ display: "flex", gap: SPACING["2"], alignItems: "center" }}>
              <MethodSelect value={a.method} onChange={(m) => updateApi(a.id, { method: m })} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <CommittingTextInput
                  key={a.id}
                  value={a.path}
                  onCommit={(v) => updateApi(a.id, { path: v })}
                  placeholder="/example/path"
                  size="sm"
                  ariaLabel="API 경로"
                />
              </div>
            </div>
            <CommittingTextInput
              key={`${a.id}-purpose`}
              value={a.purpose}
              onCommit={(v) => updateApi(a.id, { purpose: v })}
              placeholder="이 API의 목적 (엔드포인트가 아닌 무엇을 위한 것인지)"
              size="sm"
              ariaLabel="API 목적"
            />
            <div style={{ display: "flex", gap: SPACING["2"] }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CommittingTextInput
                  key={`${a.id}-success`}
                  value={a.success}
                  onCommit={(v) => updateApi(a.id, { success: v })}
                  placeholder="성공 결과"
                  size="sm"
                  ariaLabel="성공 결과"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CommittingTextInput
                  key={`${a.id}-error`}
                  value={a.error}
                  onCommit={(v) => updateApi(a.id, { error: v })}
                  placeholder="실패 결과"
                  size="sm"
                  ariaLabel="실패 결과"
                />
              </div>
            </div>
            <p style={META}>요소 {used.elementIds.length} · 페이지 {used.pageIds.length}에서 사용</p>
          </EditorCard>
        )
      })}
      <div>
        <Button variant="ghost" size="sm" onClick={() => addApi()}>
          API 추가하기
        </Button>
      </div>
    </div>
  )
}

const MethodSelect: FC<{ value: ApiMethod; onChange: (m: ApiMethod) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={<DropdownTrigger label={value} open={open} variant="outlined" isSelected />}
    >
      {API_METHODS.map((m) => (
        <DropdownItem
          key={m}
          label={m}
          selected={m === value}
          onClick={() => {
            onChange(m)
            setOpen(false)
          }}
        />
      ))}
    </Dropdown>
  )
}

const META: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: 0 }

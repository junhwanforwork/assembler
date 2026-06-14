"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { Button } from "@/components/ui"
import { CommittingTextInput, CommittingTextArea } from "@/components/builder/inspector/CommittingField"
import { SPACING } from "@/lib/design-tokens"
import { EditorCard } from "../../shared/EditorCard"

// 요구사항(WHY) 인라인 편집 — 제목·설명 + 추가/삭제 (ASS-029/030).
export const RequirementList: FC = () => {
  const requirements = useGraphStore((s) => s.graph?.requirements ?? [])
  const addRequirement = useGraphStore((s) => s.addRequirement)
  const updateRequirement = useGraphStore((s) => s.updateRequirement)
  const removeRequirement = useGraphStore((s) => s.removeRequirement)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      {requirements.map((r) => (
        <EditorCard
          key={r.id}
          deleteLabel={`요구사항 "${r.title}" 삭제`}
          onDelete={() => removeRequirement(r.id)}
        >
          <CommittingTextInput
            key={r.id}
            value={r.title}
            onCommit={(v) => updateRequirement(r.id, { title: v })}
            placeholder="요구사항 제목"
            size="sm"
            ariaLabel="요구사항 제목"
          />
          <CommittingTextArea
            key={`${r.id}-desc`}
            value={r.description}
            onCommit={(v) => updateRequirement(r.id, { description: v })}
            placeholder="이 요구사항을 한 줄로 설명해 주세요"
            rows={2}
          />
        </EditorCard>
      ))}
      <div>
        <Button variant="ghost" size="sm" onClick={() => addRequirement()}>
          요구사항 추가하기
        </Button>
      </div>
    </div>
  )
}

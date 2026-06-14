"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { Button } from "@/components/ui"
import { CommittingTextInput, CommittingTextArea } from "@/components/builder/inspector/CommittingField"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { EditorCard } from "../../shared/EditorCard"
import { StringListEditor } from "../../shared/StringListEditor"

// 기능(WHAT) 인라인 편집 — 이름·설명·비즈니스 규칙 + 추가/삭제 (ASS-029/031).
export const FeatureList: FC = () => {
  const features = useGraphStore((s) => s.graph?.features ?? [])
  const addFeature = useGraphStore((s) => s.addFeature)
  const updateFeature = useGraphStore((s) => s.updateFeature)
  const removeFeature = useGraphStore((s) => s.removeFeature)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      {features.map((f) => (
        <EditorCard key={f.id} deleteLabel={`기능 "${f.name}" 삭제`} onDelete={() => removeFeature(f.id)}>
          <CommittingTextInput
            key={f.id}
            value={f.name}
            onCommit={(v) => updateFeature(f.id, { name: v })}
            placeholder="기능 이름"
            size="sm"
            ariaLabel="기능 이름"
          />
          <CommittingTextArea
            key={`${f.id}-desc`}
            value={f.description}
            onCommit={(v) => updateFeature(f.id, { description: v })}
            placeholder="이 기능이 무엇을 하는지 설명해 주세요"
            rows={2}
          />
          <p style={SUBLABEL}>비즈니스 규칙</p>
          <StringListEditor
            seedKey={f.id}
            items={f.businessRules}
            onChange={(rules) => updateFeature(f.id, { businessRules: rules })}
            placeholder="규칙을 한 줄로 적어 주세요"
            addLabel="규칙 추가하기"
            itemNoun="비즈니스 규칙"
          />
        </EditorCard>
      ))}
      <div>
        <Button variant="ghost" size="sm" onClick={() => addFeature()}>
          기능 추가하기
        </Button>
      </div>
    </div>
  )
}

const SUBLABEL: React.CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  margin: `${SPACING["1"]} 0 0`,
}

"use client"

import { type FC, useState } from "react"
import { COLOR, INPUT, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { Button } from "@/components/ui/Button"
import { useGraphStore } from "@/lib/store/graph"
import { generateGraph } from "@/lib/assembler/generate-client"

// AI Prompt — 제품 아이디어(또는 PRD 마크다운)를 입력하면 ProjectGraph를 생성해 스토어에 적재한다.
// 생성 성공 시 loadGraph로 트리/캔버스가 자동 갱신된다. "기획계의 Cursor"의 생성 입력부.

export const AiPromptPanel: FC = () => {
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const [idea, setIdea] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = idea.trim().length > 0 && !loading

  const handleGenerate = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const graph = await generateGraph(idea)
      loadGraph(graph)
    } catch (e) {
      setError(e instanceof Error ? e.message : "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["3"] }}>
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="만들 제품을 설명해 주세요. PRD 마크다운을 붙여 넣어도 돼요."
        rows={5}
        style={{
          ...TYPOGRAPHY.STYLE.BODY_2,
          width: "100%",
          resize: "vertical",
          padding: SPACING["3"],
          color: COLOR.TEXT_PRIMARY,
          backgroundColor: INPUT.BG_DEFAULT,
          border: `1px solid ${INPUT.BORDER_DEFAULT}`,
          borderRadius: RADIUS.MD,
          outline: "none",
          transition: INPUT.TRANSITION,
        }}
      />

      {error && (
        <p style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.NEGATIVE }}>{error}</p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="solid"
          size="md"
          loading={loading}
          disabled={!canSubmit}
          onClick={handleGenerate}
        >
          그래프 만들기
        </Button>
      </div>
    </div>
  )
}

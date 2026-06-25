"use client"

import { type FC, type CSSProperties } from "react"
import { Button, TextArea } from "@/components/ui"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useGenerationProgress } from "@/lib/builder/useGenerationProgress"

// 히어로의 입력창=히어로. 큰 입력 + 단일 solid CTA + 생성 중 진행 안내(빈 스피너 방지).
interface HeroPromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  busy: boolean
}

export const HeroPromptInput: FC<HeroPromptInputProps> = ({ value, onChange, onSubmit, busy }) => {
  const canSubmit = value.trim().length > 0 && !busy
  const progress = useGenerationProgress(busy)

  return (
    <div style={WRAP_STYLE}>
      <TextArea
        value={value}
        onChange={onChange}
        placeholder="예: 러닝 크루를 위한 모임·출석 관리 앱"
        rows={4}
        maxLength={1000}
      />
      <Button
        variant="solid"
        size="lg"
        className="w-full"
        loading={busy}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        만들기
      </Button>
      {busy && progress ? (
        <p aria-live="polite" style={PROGRESS_STYLE}>
          {progress}
        </p>
      ) : null}
    </div>
  )
}

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
}

const PROGRESS_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_SECONDARY,
  margin: 0,
  textAlign: "center",
}

"use client"

import { useState, type FC, type CSSProperties } from "react"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { HeroPromptInput } from "./HeroPromptInput"
import { HeroSuggestions } from "./HeroSuggestions"
import { SampleGraphTeaser } from "./SampleGraphTeaser"

// 첫 방문자(아직 프로젝트 0개) 진입 — 입력창이 곧 히어로(manyfast 모델, 지연 가입).
// 빈 대시보드 대신 "아이디어 한 줄 → 연결된 그래프" 체험을 전면에 둔다. 생성 핸들러는 대시보드와 공유.
interface HeroEntryProps {
  onGenerate: (prompt: string) => void
  busy: boolean
}

export const HeroEntry: FC<HeroEntryProps> = ({ onGenerate, busy }) => {
  const [prompt, setPrompt] = useState("")

  const submit = () => {
    const trimmed = prompt.trim()
    if (trimmed && !busy) onGenerate(trimmed)
  }

  return (
    <section style={WRAP_STYLE} aria-label="아이디어로 시작하기">
      <div style={INTRO_STYLE}>
        <h1 style={{ ...TYPOGRAPHY.STYLE.H1, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
          제품 아이디어를 적으면, 연결된 설계로 만들어 드려요
        </h1>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_SECONDARY, margin: 0 }}>
          요구사항부터 화면·API·DB까지 한 번에 이어져요.
        </p>
      </div>

      <HeroPromptInput value={prompt} onChange={setPrompt} onSubmit={submit} busy={busy} />
      <HeroSuggestions onPick={setPrompt} disabled={busy} />
      <SampleGraphTeaser />
    </section>
  )
}

const WRAP_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "640px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: SPACING["6"],
  paddingTop: SPACING["12"],
}

const INTRO_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  textAlign: "center",
}

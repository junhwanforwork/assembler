"use client"

import { useState } from "react"
import { clsx } from "clsx"
import { Button } from "@/components/ui/Button"
import { ArrowRightIcon } from "@/components/ui/icons"
import { AssemblyLoader } from "@/components/ui/motion/AssemblyLoader"
import s from "./dashboard.module.css"

// 아이디어 입력 → 스펙 생성 진입. 어떤 상태에서도 잠기지 않는다 — 프로젝트가 없으면
// 제출 시 부모가 만들기 모달로 이어 준다(경로 C). 상태별로 카피만 바뀐다.
// "코드를 바탕으로"는 코드-진실(API·DB)이 확인된 프로젝트에서만 약속한다(C-4).
// onCodeConnect(수동 싱크-인 진입)는 프로젝트가 선택된 때만 온다 — null이면 숨김.
export function Composer({
  idea,
  onIdeaChange,
  projectName,
  hasProjects,
  hasCodeTruth,
  generating,
  onSubmit,
  onCodeConnect,
}: {
  idea: string
  onIdeaChange: (idea: string) => void
  projectName: string | null
  hasProjects: boolean
  hasCodeTruth: boolean
  generating: boolean
  onSubmit: (idea: string) => void
  onCodeConnect: (() => void) | null
}) {
  const [focused, setFocused] = useState(false)

  const canSend = !generating && idea.trim().length > 0

  const submit = () => {
    if (!canSend) return
    onSubmit(idea.trim())
  }

  const sub = projectName
    ? hasCodeTruth
      ? "선택한 프로젝트의 코드(API·DB)를 바탕으로 아이디어를 연결된 구조로 펼쳐 드려요."
      : "적어 준 아이디어를 선택한 프로젝트의 연결된 구조로 펼쳐 드려요."
    : hasProjects
      ? "프로젝트를 선택하거나, 그대로 적으면 새 프로젝트로 만들어 드려요."
      : "아이디어를 적으면 프로젝트와 함께 연결된 구조로 만들어 드려요."

  const placeholder = projectName
    ? `${projectName}에 더하고 싶은 기능이나 화면 아이디어를 적어보세요…`
    : "만들고 싶은 제품이나 기능 아이디어를 적어보세요…"

  return (
    <section className={s.hero}>
      <h1 className={s.heroTitle}>무엇을 만들어 볼까요?</h1>
      <p className={s.heroSub}>{sub}</p>
      <div className={clsx(s.composer, focused && s.focused)}>
        <textarea
          className={s.composerInput}
          placeholder={placeholder}
          value={idea}
          onChange={(e) => onIdeaChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.nativeEvent.isComposing) submit()
          }}
        />
        <div className={s.composerBar}>
          {onCodeConnect && (
            <Button variant="ghost" size="sm" onClick={onCodeConnect}>
              이미 코드가 있어요
            </Button>
          )}
          <span className={s.composerHint} role="status">
            {generating ? (
              <AssemblyLoader size={28} label="구조를 만들고 있어요…" className={s.composerLoader} />
            ) : (
              <>
                {projectName && <span className={s.cdot} />}
                {projectName ? `${projectName} 기준` : "새 프로젝트로 만들어요"}
              </>
            )}
          </span>
          <button className={s.send} onClick={submit} disabled={!canSend} aria-label="만들기" aria-busy={generating}>
            {generating ? <span className={s.spinner} aria-hidden /> : <ArrowRightIcon size={18} />}
          </button>
        </div>
      </div>
    </section>
  )
}

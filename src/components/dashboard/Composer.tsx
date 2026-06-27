"use client"

import { useState } from "react"
import { clsx } from "clsx"
import { Button } from "@/components/ui/Button"
import { PlusIcon, ArrowRightIcon } from "@/components/ui/icons"
import s from "./dashboard.module.css"

// 아이디어 입력 → 파일 생성 진입. 프로젝트가 선택돼야 그 코드 기준으로 만든다.
export function Composer({
  projectName,
  generating,
  onSubmit,
}: {
  projectName: string | null
  generating: boolean
  onSubmit: (idea: string) => void
}) {
  const [idea, setIdea] = useState("")
  const [focused, setFocused] = useState(false)

  const disabled = projectName === null
  const canSend = !disabled && !generating && idea.trim().length > 0

  const submit = () => {
    if (!canSend) return
    onSubmit(idea.trim())
    setIdea("")
  }

  return (
    <section className={s.hero}>
      <h1 className={s.heroTitle}>무엇을 만들어 볼까요?</h1>
      <p className={s.heroSub}>
        {disabled
          ? "먼저 위에서 프로젝트를 선택하면, 그 코드(API·DB) 기준으로 만들어요."
          : "선택한 프로젝트의 코드(API·DB)를 바탕으로 아이디어를 연결된 구조로 펼쳐드려요."}
      </p>
      <div className={clsx(s.composer, focused && s.focused, disabled && s.disabled)}>
        <textarea
          className={s.composerInput}
          placeholder={
            disabled ? "프로젝트를 선택해 주세요" : `${projectName}에 더하고 싶은 기능이나 화면 아이디어를 적어보세요…`
          }
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled || generating}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
          }}
        />
        <div className={s.composerBar}>
          <Button variant="ghost" size="sm" leftIcon={<PlusIcon size={15} />} disabled={disabled}>
            첨부
          </Button>
          {projectName && (
            <span className={s.composerHint}>
              <span className={s.cdot} />
              {generating ? "구조를 만들고 있어요…" : `${projectName} 기준`}
            </span>
          )}
          <button className={s.send} onClick={submit} disabled={!canSend} aria-label="만들기">
            {generating ? <span className={s.spinner} aria-hidden /> : <ArrowRightIcon size={18} />}
          </button>
        </div>
      </div>
    </section>
  )
}

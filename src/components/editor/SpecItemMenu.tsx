"use client"

import { useState } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { IconButton } from "@/components/ui/Button"
import { Popover } from "@/components/ui/Popover"
import { MoreVerticalIcon } from "@/components/ui/icons"
import { SuggestionsCard } from "./SuggestionsCard"
import m from "./SpecItemMenu.module.css"

// 아이템(요구사항·기능) 3dot 메뉴(ASM-081) — 창업자 #6 "AI 제안은 뜬금없음 → 우클릭이나 3dot으로".
// 상시 우패널 카드를 대체: 필요할 때 아이템에서 꺼낸다. 메뉴 내용 = SuggestionsCard(제안 목록·jump·dismiss).
// 유료 AI 생성은 SuggestionsCard 안의 명시 버튼("분석하기")에서만 발사한다(자동 발사 없음, ASM-048).
// Popover는 열릴 때만 content를 마운트하지만 제안 상태는 store 소유라 닫아도 결과가 유지된다.
export function SpecItemMenu({
  workspaceId,
  design,
  kind,
  className,
}: {
  workspaceId: string
  design: WorkspaceDesign
  // 라벨은 아이템 표시명이 아니라 종류(요구사항·기능)로 붙인다 — 표시명을 넣으면 이름 기반
  // 셀렉터(뷰 테스트들)와 접근성 이름이 충돌한다. 어느 아이템인지는 행/카드 맥락이 전달한다.
  kind: "requirement" | "feature"
  // 배치 클래스는 바깥 래퍼(=Popover 앵커)에 얹는다 — 트리거를 절대배치하면 앵커 span이
  // 0크기로 접혀 floating 좌표가 어긋난다(앵커 rect 기준 계산). 래퍼에서 배치해야 앵커가 정상 크기.
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const noun = kind === "requirement" ? "요구사항" : "기능"

  return (
    <span className={clsx(m.wrap, className)}>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        width={300}
        aria-label={`${noun} AI 제안 메뉴`}
        content={<SuggestionsCard workspaceId={workspaceId} design={design} />}
      >
        <IconButton
          className={m.trigger}
          label={`${noun} AI 제안 열기`}
          aria-haspopup="dialog"
          aria-expanded={open}
          // 행/카드 선택(selectSpec* → 상세 자동 오픈)과 분리 — 메뉴 열기가 아이템을 선택하지 않게.
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
        >
          <MoreVerticalIcon size={16} />
        </IconButton>
      </Popover>
    </span>
  )
}

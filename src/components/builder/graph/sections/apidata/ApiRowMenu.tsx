"use client"

import { useState, type CSSProperties, type FC } from "react"
import { Dropdown, DropdownItem } from "@/components/ui"
import { COLOR, RADIUS } from "@/lib/design-tokens"

// 행 kebab 메뉴 (ASS-080) — View detail / Edit / Copy endpoint / View related page.
// 기존 Dropdown(포털·outside-click·esc)을 재사용. 트리거는 토큰 raw button + aria-label.
export type ApiMenuAction = "detail" | "edit" | "copyEndpoint" | "relatedPage"

export const ApiRowMenu: FC<{
  onAction: (action: ApiMenuAction) => void
  hasRelatedPage: boolean
}> = ({ onAction, hasRelatedPage }) => {
  const [open, setOpen] = useState(false)

  function run(action: ApiMenuAction) {
    setOpen(false)
    onAction(action)
  }

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="right"
      trigger={
        <button
          type="button"
          aria-label="API 메뉴 열기"
          aria-haspopup="menu"
          aria-expanded={open}
          style={KEBAB}
        >
          ⋯
        </button>
      }
    >
      <DropdownItem label="자세히 보기" onClick={() => run("detail")} />
      <DropdownItem label="편집하기" onClick={() => run("edit")} />
      <DropdownItem label="엔드포인트 복사하기" onClick={() => run("copyEndpoint")} />
      <DropdownItem label="관련 화면 보기" disabled={!hasRelatedPage} onClick={() => run("relatedPage")} />
    </Dropdown>
  )
}

const KEBAB: CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: RADIUS.SM,
  border: "none",
  background: "transparent",
  color: COLOR.TEXT_MUTED,
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
}

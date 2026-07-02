"use client"

import { useState } from "react"
import { clsx } from "clsx"
import type { Workspace } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Avatar } from "@/components/ui/Avatar"
import { Button, IconButton } from "@/components/ui/Button"
import { Popover } from "@/components/ui/Popover"
import { ChevronDown, ClockIcon, PanelLeftIcon, PanelRightIcon, SparkIcon } from "./icons"
import s from "./editor.module.css"

// Layer 2 TopBar — 좌: 접기 + 작업 스코프 드롭다운(시각). 우: 기록/내보내기/공유 placeholder + 아바타.
export function TopBar({ workspace }: { workspace: Workspace }) {
  const toggleLeft = useEditorStore((st) => st.toggleLeft)
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={s.topbar}>
      <div className={s.brandMark}>
        <SparkIcon className={s.spark} />
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          width={248}
          content={
            <div>
              <div className={s.pmHead}>작업 스코프</div>
              <div className={clsx(s.pmItem, s.pmItemActive)}>
                ● {workspace.name} <span className={clsx(s.muted, s.spacer)}>현재</span>
              </div>
              <div className={clsx(s.pmItem, s.pmAdd)}>＋ 새 작업 파일</div>
            </div>
          }
        >
          <button className={s.proj} onClick={() => setMenuOpen((o) => !o)}>
            <span>{workspace.name}</span>
            <ChevronDown />
          </button>
        </Popover>
        <IconButton label="사이드바 접기" onClick={toggleLeft}>
          <PanelLeftIcon />
        </IconButton>
      </div>

      <div className={s.topbarRight}>
        {/* 기록·내보내기·공유는 Phase 1 미배선(editor-interactions #7·#9·#10) — 배선 전까지 disabled */}
        <IconButton label="기록" disabled>
          <ClockIcon />
        </IconButton>
        <IconButton label="우측 패널 접기" onClick={toggleRight}>
          <PanelRightIcon />
        </IconButton>
        <Button variant="ghost" size="sm" disabled>
          내보내기
        </Button>
        <Button variant="filled" size="sm" disabled>
          공유하기
        </Button>
        <Avatar initial="J" size={30} />
      </div>
    </header>
  )
}

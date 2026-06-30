"use client"

import { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import type { Workspace } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { ChevronDown, ClockIcon, PanelLeftIcon, PanelRightIcon, SparkIcon } from "./icons"
import s from "./editor.module.css"

// 상단 바 — 좌: 접기 + 파일 스코프 드롭다운(시각). 우: 기록/내보내기/공유 placeholder + 아바타.
export function EditorTopBar({ workspace }: { workspace: Workspace }) {
  const toggleLeft = useEditorStore((st) => st.toggleLeft)
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [menuOpen])

  return (
    <header className={s.topbar}>
      <div className={s.brandMark}>
        <SparkIcon className={s.spark} />
        <div className={s.projWrap} ref={wrapRef}>
          <button
            className={s.proj}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
          >
            <span>{workspace.name}</span>
            <ChevronDown />
          </button>
          {menuOpen && (
            <div className={s.projMenu}>
              <div className={s.pmHead}>작업 스코프</div>
              <div className={clsx(s.pmItem, s.pmItemActive)}>
                ● {workspace.name} <span className={s.muted} style={{ marginLeft: "auto" }}>현재</span>
              </div>
              <div className={clsx(s.pmItem, s.pmAdd)}>＋ 새 작업 파일</div>
            </div>
          )}
        </div>
        <button className={s.iconBtn} onClick={toggleLeft} aria-label="사이드바 접기">
          <PanelLeftIcon />
        </button>
      </div>

      <div className={s.topbarRight}>
        <button className={s.iconBtn} aria-label="기록">
          <ClockIcon />
        </button>
        <button className={s.iconBtn} onClick={toggleRight} aria-label="우측 패널 접기">
          <PanelRightIcon />
        </button>
        <button className={clsx(s.btn, s.btnGhost)}>내보내기</button>
        <button className={clsx(s.btn, s.btnFilled)}>공유하기</button>
        <div className={s.avatar}>J</div>
      </div>
    </header>
  )
}

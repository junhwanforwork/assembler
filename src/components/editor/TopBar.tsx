"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { clsx } from "clsx"
import type { Workspace } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Avatar } from "@/components/ui/Avatar"
import { Button, IconButton } from "@/components/ui/Button"
import { Popover } from "@/components/ui/Popover"
import { BrandSpark } from "@/components/ui/motion/BrandSpark"
import { ChevronDown, ClockIcon, PanelLeftIcon, PanelRightIcon } from "./icons"
import s from "./editor.module.css"

// TopBar — 로고=대시보드 복귀(#1), 스코프=프로젝트 내 스펙 목록·전환(#3), ＋새 스펙(#4).
// 우: 기록/내보내기/공유 placeholder + 아바타.
export function TopBar({ workspace }: { workspace: Workspace }) {
  const toggleLeft = useEditorStore((st) => st.toggleLeft)
  const toggleRight = useEditorStore((st) => st.toggleRight)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={s.topbar}>
      <div className={s.brandMark}>
        <Link href="/" className={s.homeLink} aria-label="대시보드로 돌아가기">
          <BrandSpark size={20} className={s.spark} />
        </Link>
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          width={248}
          aria-label="스펙 전환"
          content={<ScopeMenu workspace={workspace} onNavigate={() => setMenuOpen(false)} />}
        >
          {/* key=workspace.id — 스펙 전환 시 이름·편집 상태를 리마운트로 재초기화(동기화 effect 불필요). */}
          <ScopeTrigger key={workspace.id} workspace={workspace} menuOpen={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
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

// 스코프 트리거 — 새 스펙 직후(?new=1)에는 인라인 rename 입력으로 바뀐다(#4).
function ScopeTrigger({
  workspace,
  menuOpen,
  onToggle,
}: {
  workspace: Workspace
  menuOpen: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(workspace.name)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(workspace.name)
  const [saving, setSaving] = useState(false)
  const [renameFailed, setRenameFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 새 스펙으로 진입(?new=1)하면 이름 짓기부터 — useSearchParams 대신 마운트 시 1회 읽기(Suspense 요구 회피).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 플래그는 외부 시스템, 마운트 1회 동기화.
      setRenaming(true)
    }
  }, [])

  useEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  const finishRename = () => {
    setRenaming(false)
    // rename 모드 진입 플래그 제거 — 새로고침 시 입력이 다시 뜨지 않게.
    router.replace(`/editor/${workspace.id}`)
  }

  const commit = async () => {
    const name = draft.trim()
    if (saving) return
    if (!name || name === workspace.name) {
      finishRename()
      return
    }
    setSaving(true)
    setRenameFailed(false)
    try {
      const updated = await api.patch<Workspace>(`/api/workspaces/${workspace.id}`, { name })
      setDisplayName(updated.name)
      finishRename()
    } catch {
      // 편집 상태는 유지 — 다시 시도하거나 Esc로 나갈 수 있게 실패를 알린다.
      setRenameFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (renaming) {
    return (
      <>
        <input
          ref={inputRef}
          className={s.projRename}
          value={draft}
          aria-label="스펙 이름"
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit()
            if (e.key === "Escape") finishRename()
          }}
        />
        {renameFailed && <span className={s.renameError}>이름을 저장하지 못했어요. 다시 시도해 주세요.</span>}
      </>
    )
  }

  return (
    <button className={s.proj} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={onToggle}>
      <span>{displayName}</span>
      <ChevronDown />
    </button>
  )
}

type MenuState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; workspaces: Workspace[] }

// 스코프 메뉴 — 프로젝트 내 스펙 목록(#3). Popover가 열릴 때만 마운트되므로 열 때마다 새로 불러온다.
function ScopeMenu({ workspace, onNavigate }: { workspace: Workspace; onNavigate: () => void }) {
  const router = useRouter()
  const [state, setState] = useState<MenuState>({ kind: "loading" })
  const [creating, setCreating] = useState(false)
  const [createFailed, setCreateFailed] = useState(false)

  useEffect(() => {
    let active = true
    api
      .get<{ workspaces: Workspace[] }>(`/api/workspaces?productId=${workspace.productId}`)
      .then((res) => {
        if (active) setState({ kind: "ready", workspaces: res.workspaces })
      })
      .catch(() => {
        if (active) setState({ kind: "error" })
      })
    return () => {
      active = false
    }
  }, [workspace.productId])

  const switchTo = (id: string) => {
    onNavigate()
    if (id !== workspace.id) router.push(`/editor/${id}`)
  }

  // ＋새 스펙(#4) — 생성 후 즉시 해당 에디터로 이동, ?new=1이 인라인 rename을 연다.
  const createSpec = async () => {
    if (creating) return
    setCreating(true)
    setCreateFailed(false)
    try {
      const created = await api.post<Workspace>("/api/workspaces", {
        productId: workspace.productId,
        name: "새 스펙",
      })
      onNavigate()
      router.push(`/editor/${created.id}?new=1`)
    } catch {
      setCreateFailed(true)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className={s.pmHead}>이 프로젝트의 스펙</div>
      {state.kind === "loading" && <div className={s.pmItem}>불러오는 중이에요…</div>}
      {state.kind === "error" && <div className={s.pmItem}>목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</div>}
      {state.kind === "ready" &&
        state.workspaces.map((w) => (
          <button
            key={w.id}
            className={clsx(s.pmItem, w.id === workspace.id && s.pmItemActive)}
            onClick={() => switchTo(w.id)}
          >
            ● {w.name}
            {w.id === workspace.id && <span className={clsx(s.muted, s.spacer)}>현재</span>}
          </button>
        ))}
      {createFailed && <div className={s.pmError}>스펙을 만들지 못했어요. 잠시 후 다시 시도해 주세요.</div>}
      <button className={clsx(s.pmItem, s.pmAdd)} onClick={createSpec} disabled={creating}>
        {creating ? "만드는 중이에요…" : "＋ 새 스펙 만들기"}
      </button>
    </div>
  )
}

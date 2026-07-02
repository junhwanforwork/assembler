"use client"

import { clsx } from "clsx"
import { useEditorStore, type EditorView } from "@/lib/stores/useEditorStore"
import { ApiListIcon, ChatIcon, DatabaseIcon, TreeFolderIcon } from "./icons"
import s from "./editor.module.css"

const ARTIFACTS: { view: EditorView; num: number; label: string; badge?: { text: string; beta?: boolean } }[] = [
  { view: "doc", num: 1, label: "문서" },
  { view: "spec", num: 2, label: "기능명세서" },
  { view: "flow", num: 3, label: "유저플로우" },
  { view: "wire", num: 4, label: "와이어프레임", badge: { text: "BETA", beta: true } },
]

// 좌측 — [파일트리 / AI 챗] 토글.
export function EditorTree() {
  const leftMode = useEditorStore((st) => st.leftMode)
  const setLeftMode = useEditorStore((st) => st.setLeftMode)

  return (
    <aside className={s.left}>
      <div className={s.leftSwitch}>
        <button
          className={clsx(s.seg, leftMode === "tree" && s.segActive)}
          onClick={() => setLeftMode("tree")}
        >
          <TreeFolderIcon /> 파일트리
        </button>
        <button
          className={clsx(s.seg, leftMode === "chat" && s.segActive)}
          onClick={() => setLeftMode("chat")}
        >
          <ChatIcon /> AI 챗
        </button>
      </div>

      {leftMode === "tree" ? <FileTree /> : <ChatPane />}
    </aside>
  )
}

function FileTree() {
  const activeView = useEditorStore((st) => st.activeView)
  const dataSeg = useEditorStore((st) => st.dataSeg)
  const setActiveView = useEditorStore((st) => st.setActiveView)
  const openData = useEditorStore((st) => st.openData)

  return (
    <div className={s.leftPane}>
      <div className={s.tree}>
        <div className={s.treeGroupHead}>파일트리</div>

        {ARTIFACTS.map((a) => (
          <button
            key={a.view}
            className={clsx(s.trow, activeView === a.view && s.trowActive)}
            onClick={() => setActiveView(a.view)}
          >
            <span className={s.tnum}>{a.num}</span>
            {a.label}
            {a.badge && <span className={a.badge.beta ? s.abadgeBeta : s.abadge}>{a.badge.text}</span>}
          </button>
        ))}

        <div className={s.treeDivider} />
        <div className={s.tcommon}>공통 · git 동기</div>

        <button
          className={clsx(s.trow, activeView === "data" && dataSeg === "db" && s.trowActive)}
          onClick={() => openData("db")}
        >
          <DatabaseIcon />
          DB
        </button>
        <button
          className={clsx(s.trow, activeView === "data" && dataSeg === "api" && s.trowActive)}
          onClick={() => openData("api")}
        >
          <ApiListIcon />
          API
        </button>
      </div>
    </div>
  )
}

// AI 챗 — 실배선 전까지 다른 미구현 뷰(DocView 등)와 동일한 준비 중 빈 상태.
// 가짜 대화 목업 금지(모킹 금지 — 실제 동작 코드만).
function ChatPane() {
  return (
    <div className={s.leftPane}>
      <div className={s.placeholder}>
        <div className={s.placeholderTitle}>AI 챗은 준비 중이에요</div>
        <div className={s.placeholderSub}>여기서 대화로 문서·명세·플로우를 다듬을 수 있게 곧 열어드릴게요.</div>
      </div>
    </div>
  )
}

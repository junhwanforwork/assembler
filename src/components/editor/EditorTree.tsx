"use client"

import { clsx } from "clsx"
import { useEditorStore, type EditorView } from "@/lib/stores/useEditorStore"
import {
  ApiListIcon,
  ChatIcon,
  DatabaseIcon,
  SendIcon,
  TreeFolderIcon,
} from "./icons"
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

// AI 챗 — 정적(친절 추천 메시지 포함). 실제 호출 없음(읽기 전용 슬라이스).
function ChatPane() {
  return (
    <div className={s.leftPane}>
      <div className={s.chat}>
        <div className={s.chatLog}>
          <div className={s.qaQ}>Q. 이 제품의 핵심 기능은 무엇인가요? (복수 선택)</div>
          <div className={s.qaA}>수리 접수 및 진단, 수리 비용 결제, 수리 진행 상황 조회, 부품 재고 확인</div>
          <div className={s.aiLine}>
            답변을 바탕으로 PRD·기능명세서·유저플로우·와이어프레임을 연결된 구조로 만들었어요. 이어서 무엇을
            다듬을까요?
          </div>
          <div className={s.aiLine}>
            예를 들어 결제에 쿠폰을 추가하고 싶으면, 이런 걸 쓸 수 있어요.
            <div className={s.chatRec}>
              <div className={s.recItem}>
                <span className={clsx(s.useTag, s.useTagHave)}>이미 있어요</span>
                <div>
                  <div className={s.recT}>결제를 처리하는 기능</div>
                  <div className={s.recMeta}>
                    <span className={clsx(s.method, s.mPost)}>POST</span> <span className={s.mono}>/payments</span> —
                    그대로 쓰면 돼요
                  </div>
                </div>
              </div>
              <div className={s.recItem}>
                <span className={clsx(s.useTag, s.useTagNew)}>새로 만들어요</span>
                <div>
                  <div className={s.recT}>쿠폰 정보를 저장할 곳</div>
                  <div className={s.recMeta}>
                    데이터 <span className={s.dbn}>coupons</span> — 개발자가 추가하면 돼요
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={s.chipRow}>
            <button className={s.chip}>✶ 결제 화면에 법인 카드 추가하기</button>
            <button className={s.chip}>매니페스트 어떻게 써요?</button>
            <button className={s.chip}>기획 문서 전체 검토하기</button>
          </div>
        </div>
        <div className={s.chatComposer}>
          <div className={s.chatBox}>
            <textarea placeholder="'@'로 아이템을 언급하거나, 만들고 싶은 걸 적어보세요…" />
            <div className={s.chatBar}>
              <span className={s.modelChip}>
                claude-opus-4-8 <ChevronChip />
              </span>
              <button className={s.sendSm} aria-label="보내기">
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronChip() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

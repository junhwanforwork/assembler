"use client"

import { type FC, type CSSProperties, useState } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete, isGraphEmpty } from "@/lib/graph/selectors"
import { Button } from "@/components/ui"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"

// 빌더 상단 바: 프로젝트 정체성 + 진행률 + 전역 액션(공유·내보내기 — 후속 배선) + 채팅 위치 제어(ASS-072).
export const GraphHeader: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const chatVisible = useGraphStore((s) => s.chatVisible)
  const chatSide = useGraphStore((s) => s.chatSide)
  const toggleChat = useGraphStore((s) => s.toggleChat)
  const setChatSide = useGraphStore((s) => s.setChatSide)
  if (!graph) return null

  const total = graph.uiElements.length
  const complete = graph.uiElements.filter(isMappingComplete).length
  const progress = total === 0 ? 0 : Math.round((complete / total) * 100)

  // 채팅은 빈 그래프에서 중앙 히어로 — 위치 제어(접기·좌우)는 측면 도크(작업 있음)일 때만 의미 있음.
  const isDocked = !isGraphEmpty(graph)
  const isLeft = chatSide === "left"

  return (
    <header style={HEADER_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["3"], minWidth: 0 }}>
        <span
          style={{
            ...TYPOGRAPHY.STYLE.TITLE_2_KO,
            color: COLOR.TEXT_PRIMARY,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {graph.name || "제목 없는 프로젝트"}
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
          매핑 완성 {progress}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
        {isDocked ? (
          <div style={{ display: "flex", alignItems: "center", gap: SPACING["1"] }}>
            <IconButton
              label={chatVisible ? "채팅 접기" : "채팅 펼치기"}
              active={chatVisible}
              onClick={toggleChat}
            >
              <ChatIcon />
            </IconButton>
            {chatVisible ? (
              <IconButton
                label={isLeft ? "채팅을 오른쪽으로 옮기기" : "채팅을 왼쪽으로 옮기기"}
                onClick={() => setChatSide(isLeft ? "right" : "left")}
              >
                {isLeft ? <ChatRightIcon /> : <ChatLeftIcon />}
              </IconButton>
            ) : null}
          </div>
        ) : null}
        <Button variant="neutral" size="sm">
          공유하기
        </Button>
        <Button variant="neutral" size="sm">
          내보내기
        </Button>
      </div>
    </header>
  )
}

// 아이콘 전용 버튼 — Button 컴포넌트는 aria-label/정사각 미지원 → 토큰 스타일 raw button(button.md §6·§7).
const IconButton: FC<{
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}> = ({ label, active = false, onClick, children }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...ICON_BTN_STYLE,
        color: active ? COLOR.ACCENT : COLOR.TEXT_SECONDARY,
        backgroundColor: hovered ? INTERACTION.HOVER_BG_SURFACE : "transparent",
      }}
    >
      {children}
    </button>
  )
}

// 플로팅 셸 상단 바 — 보더 없이 BG_BASE 배경(아래 패널들이 그 위에 뜸).
const HEADER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "52px",
  flexShrink: 0,
  padding: `0 ${SPACING["4"]}`,
  backgroundColor: COLOR.BG_BASE,
}

const ICON_BTN_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: RADIUS.PILL,
  border: "none",
  cursor: "pointer",
  transition: INTERACTION.TRANSITION_BG,
}

// 말풍선 — 채팅 토글.
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v6A1.5 1.5 0 0 1 13.5 12H7l-3.2 2.6a.5.5 0 0 1-.8-.4V4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 도크가 왼쪽일 때 → 오른쪽으로 보내기(오른쪽 사이드바 표시).
function ChatRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="3" width="4.5" height="12" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// 도크가 오른쪽일 때 → 왼쪽으로 보내기(왼쪽 사이드바 표시).
function ChatLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.5" y="3" width="4.5" height="12" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

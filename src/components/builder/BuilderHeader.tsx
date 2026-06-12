"use client"

import { type FC } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useBuilderStore } from "@/lib/store/builder"
import type { SaveStatus } from "@/hooks/useBuilderAutosave"

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "저장하고 있어요",
  saved: "저장했어요",
  error: "저장하지 못했어요",
}

interface BuilderHeaderProps {
  saveStatus: SaveStatus
}

// 빌더 상단 바: 제목 편집 · 뷰 전환(화면/플로우) · 화면 추가 · 저장 상태.
export const BuilderHeader: FC<BuilderHeaderProps> = ({ saveStatus }) => {
  const router = useRouter()
  const title = useBuilderStore((s) => s.title)
  const setTitle = useBuilderStore((s) => s.setTitle)
  const view = useBuilderStore((s) => s.view)
  const setView = useBuilderStore((s) => s.setView)
  const addScreen = useBuilderStore((s) => s.addScreen)

  return (
    <header style={HEADER_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["3"], minWidth: 0 }}>
        <button
          type="button"
          aria-label="목록으로 가기"
          onClick={() => router.push("/")}
          style={BACK_STYLE}
        >
          ←
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없는 프로젝트"
          aria-label="프로젝트 제목"
          style={TITLE_INPUT_STYLE}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: SPACING["3"] }}>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, minWidth: "84px", textAlign: "right" }}>
          {SAVE_LABEL[saveStatus]}
        </span>

        <div style={TOGGLE_WRAP_STYLE} role="tablist" aria-label="뷰 전환">
          <ToggleTab active={view === "screen"} onClick={() => setView("screen")}>
            화면
          </ToggleTab>
          <ToggleTab active={view === "flow"} onClick={() => setView("flow")}>
            플로우
          </ToggleTab>
        </div>

        <Button variant="primary" size="sm" onClick={addScreen}>
          화면 추가하기
        </Button>
      </div>
    </header>
  )
}

const ToggleTab: FC<{ active: boolean; onClick: () => void; children: string }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    style={{
      padding: `${SPACING["1"]} ${SPACING["3"]}`,
      borderRadius: RADIUS.SM,
      border: "none",
      cursor: "pointer",
      ...TYPOGRAPHY.STYLE.LABEL_1,
      backgroundColor: active ? COLOR.BG_BASE : "transparent",
      color: active ? COLOR.TEXT_PRIMARY : COLOR.TEXT_MUTED,
    }}
  >
    {children}
  </button>
)

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: SPACING["4"],
  height: "56px",
  flexShrink: 0,
  padding: `0 ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_BASE,
}

const BACK_STYLE: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: RADIUS.SM,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: "transparent",
  color: COLOR.TEXT_SECONDARY,
  cursor: "pointer",
  flexShrink: 0,
}

const TITLE_INPUT_STYLE: React.CSSProperties = {
  ...TYPOGRAPHY.STYLE.TITLE_2,
  color: COLOR.TEXT_PRIMARY,
  background: "transparent",
  border: "none",
  outline: "none",
  minWidth: 0,
  flex: 1,
}

const TOGGLE_WRAP_STYLE: React.CSSProperties = {
  display: "flex",
  gap: SPACING["1"],
  padding: SPACING["1"],
  borderRadius: RADIUS.MD,
  backgroundColor: COLOR.BG_SECTION,
}

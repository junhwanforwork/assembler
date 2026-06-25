"use client"

import { type FC } from "react"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 빈 그래프 캔버스 안내(ASS-207) — 아직 객체가 0개일 때 중앙에 "왜 비었는지 + 어떻게 채우는지"를 보여준다.
// 입력 수단은 채팅 도크가 소유 — 여기선 다음 행동(채팅으로 시작)만 안내한다(ux-writing 빈 상태 패턴).
export const CanvasEmptyState: FC = () => {
  return (
    <div style={WRAP_STYLE}>
      <span aria-hidden="true" style={{ fontSize: "32px", color: COLOR.TEXT_MUTED }}>
        ◇
      </span>
      <h2 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
        아직 비어 있어요
      </h2>
      <p
        style={{
          ...TYPOGRAPHY.STYLE.BODY_2,
          color: COLOR.TEXT_SECONDARY,
          margin: 0,
          maxWidth: "360px",
        }}
      >
        만들고 싶은 제품을 채팅으로 설명하면 요구사항부터 화면·API까지 연결된 그래프로 만들어 드려요.
      </p>
    </div>
  )
}

const WRAP_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: SPACING["3"],
  height: "100%",
  padding: SPACING["8"],
  textAlign: "center",
}

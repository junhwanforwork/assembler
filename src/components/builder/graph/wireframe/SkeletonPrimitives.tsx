"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 와이어프레임 스켈레톤 프리미티브 — 모노크롬 토큰만(accent/status 색 금지).
// SkeletonBlockRenderer가 11개 케이스를 이 4개로 조립한다(DRY·SRP).
// 대비 2단: 구조/라벨 = TEXT_SECONDARY(읽힘), filler 바/크롬 = BORDER_*(후퇴) → "의도된 low-fi".

// SkelBox — 컨트롤 외곽 셸(outline). input·textarea·dropdown·stepper·button 공용.
// solid fill 금지(로딩 시머처럼 보임) → 투명/surface + 1px 보더.
function boxStyle(height: number, radius: string): CSSProperties {
  return {
    height,
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: SPACING["2"],
    padding: `0 ${SPACING["3"]}`,
    backgroundColor: COLOR.BG_SURFACE,
    border: `1px solid ${COLOR.BORDER_DEFAULT}`,
    borderRadius: radius,
    boxSizing: "border-box",
  }
}

export const SkelBox: FC<{ height: number; radius?: string; style?: CSSProperties; children?: ReactNode }> = ({
  height,
  radius = RADIUS.MD,
  style,
  children,
}) => <div style={{ ...boxStyle(height, radius), ...style }}>{children}</div>

// SkelBar — 작성 안 한 내용 placeholder 바. 의미 있는 라벨엔 절대 쓰지 않는다(텍스트로 렌더).
export const SkelBar: FC<{ width: number | string; height?: number; tone?: "strong" | "muted"; style?: CSSProperties }> = ({
  width,
  height = 8,
  tone = "strong",
  style,
}) => (
  <div
    aria-hidden
    style={{
      width,
      height,
      borderRadius: RADIUS.XS,
      backgroundColor: tone === "strong" ? COLOR.BORDER_STRONG : COLOR.BORDER_DEFAULT,
      ...style,
    }}
  />
)

// SkelLabel — 필드/섹션 라벨(실제 텍스트, muted). "이 입력이 뭔지" 읽혀야 리뷰가 된다.
const SKEL_LABEL: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
  color: COLOR.TEXT_SECONDARY,
  marginBottom: SPACING["1"],
  display: "block",
}

export const SkelLabel: FC<{ children: ReactNode }> = ({ children }) => <span style={SKEL_LABEL}>{children}</span>

// SkelText — 실제 텍스트 모노크롬. typo는 TYPOGRAPHY.STYLE.* 엔트리.
export const SkelText: FC<{ typo: CSSProperties; color: string; style?: CSSProperties; children: ReactNode }> = ({
  typo,
  color,
  style,
  children,
}) => <span style={{ ...typo, color, margin: 0, ...style }}>{children}</span>

// 라벨 + 컨트롤 세로 묶음 — input·textarea·dropdown 공용 레이아웃.
export const SkelField: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
    <SkelLabel>{label}</SkelLabel>
    {children}
  </div>
)

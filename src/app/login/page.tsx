"use client"

import { type CSSProperties } from "react"
import { OAuthButtons } from "@/components/auth/OAuthButtons"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 로그인/가입 진입 — 헤더 "로그인하기"에서 도달. 가치 포착 모달(AuthGateModal)과 같은 OAuthButtons 재사용.
export default function LoginPage() {
  return (
    <div style={WRAP_STYLE}>
      <div style={CARD_STYLE}>
        <div style={INTRO_STYLE}>
          <h1 style={{ ...TYPOGRAPHY.STYLE.H2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
            가입하고 어디서나 이어서 작업해요
          </h1>
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: 0 }}>
            만든 설계가 계정에 보관되고, 다른 기기에서도 그대로 이어갈 수 있어요.
          </p>
        </div>
        <OAuthButtons next="/" />
      </div>
    </div>
  )
}

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_BASE,
}

const CARD_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  gap: SPACING["6"],
  padding: SPACING["8"],
  borderRadius: RADIUS.LG,
  backgroundColor: COLOR.PANEL_BG,
  boxShadow: SHADOW.MODAL,
}

const INTRO_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  textAlign: "center",
}

"use client"

import { type FC, type CSSProperties } from "react"
import Link from "next/link"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useUser } from "@/lib/auth/useUser"

// 헤더 우측 인증 표시 — 로그인 시 이니셜 아바타, 비로그인 시 "로그인하기" 링크(→ /login).
// 로딩 중엔 자리만 차지하지 않게 비운다(짧은 깜빡임 허용 — 헤더 레이아웃은 우측 정렬이라 시프트 미미).
export const AuthIndicator: FC = () => {
  const { user, loading } = useUser()

  if (loading) return null

  if (!user) {
    return (
      <Link href="/login" style={LOGIN_STYLE}>
        로그인하기
      </Link>
    )
  }

  const initial = (user.email?.[0] ?? "U").toUpperCase()
  return (
    <span style={AVATAR_STYLE} title={user.email ?? "내 계정"} aria-label="내 계정">
      {initial}
    </span>
  )
}

const LOGIN_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_1,
  color: COLOR.TEXT_SECONDARY,
  textDecoration: "none",
  padding: `${SPACING["1"]} ${SPACING["2"]}`,
}

const AVATAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: RADIUS.PILL,
  background: COLOR.ACCENT,
  color: COLOR.TEXT_INVERSE,
  fontSize: "13px",
  fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
  userSelect: "none",
}

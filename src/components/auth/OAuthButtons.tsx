"use client"

import { type FC, type CSSProperties, useState } from "react"
import { Button } from "@/components/ui"
import { signInWithProvider, type OAuthProvider } from "@/lib/auth/oauth"
import { SPACING } from "@/lib/design-tokens"

// Google/GitHub 가입·로그인 버튼. 성공 시 OAuth 리다이렉트로 언마운트되므로 busy는 실패에서만 해제한다.
// OAuth 버튼은 화면 단일 solid 규칙과 별개 — 동급 두 선택지라 primary 두 개로 둔다(button.md: primary 2~3개 허용).
interface OAuthButtonsProps {
  next?: string
}

export const OAuthButtons: FC<OAuthButtonsProps> = ({ next = "/" }) => {
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  const start = async (provider: OAuthProvider) => {
    if (busy) return
    setBusy(provider)
    try {
      await signInWithProvider(provider, next)
    } catch {
      setBusy(null)
    }
  }

  return (
    <div style={WRAP_STYLE}>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={busy === "google"}
        disabled={busy !== null}
        leftIcon={<GoogleIcon />}
        onClick={() => start("google")}
      >
        Google로 시작하기
      </Button>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={busy === "github"}
        disabled={busy !== null}
        leftIcon={<GithubIcon />}
        onClick={() => start("github")}
      >
        GitHub로 시작하기
      </Button>
    </div>
  )
}

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
}

// Google 공식 브랜드 4색 — 로고 정체성이라 토큰화 대상이 아니다(ds-tokens.md brand_color 예외와 동일).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.02-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.98 7.28C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <path d="M9 0C4.03 0 0 4.13 0 9.23c0 4.08 2.58 7.54 6.16 8.76.45.09.61-.2.61-.44l-.01-1.7c-2.5.56-3.04-1.1-3.04-1.1-.41-1.07-1-1.36-1-1.36-.82-.57.06-.56.06-.56.9.07 1.38.95 1.38.95.8 1.41 2.1 1 2.62.77.08-.6.31-1 .57-1.24-2-.23-4.1-1.02-4.1-4.56 0-1.01.35-1.83.92-2.48-.09-.23-.4-1.17.09-2.43 0 0 .76-.25 2.48.95a8.4 8.4 0 0 1 4.5 0c1.72-1.2 2.48-.95 2.48-.95.49 1.26.18 2.2.09 2.43.57.65.92 1.47.92 2.48 0 3.55-2.11 4.33-4.12 4.56.32.29.61.85.61 1.72l-.01 2.55c0 .24.16.53.62.44A9.24 9.24 0 0 0 18 9.23C18 4.13 13.97 0 9 0Z" />
    </svg>
  )
}

"use client"

import { createClient } from "@/lib/supabase/client"
import { getSessionId } from "@/lib/session"

export type OAuthProvider = "google" | "github"

// 가치 포착 시점(저장·공유·내보내기)에 호출 — 현재 익명 세션 id를 redirectTo 에 실어 보내,
// 콜백에서 그 세션의 프로젝트를 새 계정으로 승계한다. next 는 로그인 후 돌아올 앱 내부 경로.
export async function signInWithProvider(provider: OAuthProvider, next = "/"): Promise<void> {
  const supabase = createClient()
  const sid = getSessionId()
  const params = new URLSearchParams({ sid, next })
  const redirectTo = `${window.location.origin}/auth/callback?${params.toString()}`
  await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
}

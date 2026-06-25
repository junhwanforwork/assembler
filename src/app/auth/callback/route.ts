import { NextResponse } from "next/server"
import { createBuilderClient } from "@/lib/supabase/builder"

// OAuth 리다이렉트 착지 — code를 세션으로 교환하고, 익명 세션 프로젝트를 계정으로 승계한 뒤 next로 보낸다.
// createBuilderClient 는 쿠키 어댑터(세션 저장)와 claim RPC 타입을 함께 갖춘 서버 클라이언트다.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const sid = url.searchParams.get("sid") ?? ""

  // 오픈 리다이렉트 방어 — 문자열 prefix가 아니라 "해석 후 동일 출처" 확인.
  // 백슬래시(/\evil)·탭/개행·프로토콜-상대(//)·외부 절대 URL은 해석 시 출처가 달라져 홈으로 떨어진다.
  const candidate = new URL(url.searchParams.get("next") ?? "/", url.origin)
  const next = candidate.origin === url.origin ? candidate.pathname + candidate.search : "/"

  if (code) {
    try {
      const supabase = await createBuilderClient(sid)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      // 교환 성공 + 세션 id 있으면 익명 프로젝트 승계(멱등). 승계 실패는 로그인을 막지 않되 관측은 남긴다.
      if (!error && sid) {
        const { error: claimError } = await supabase.rpc("claim_session_projects", { p_session_id: sid })
        if (claimError) console.error("claim_session_projects 실패", { sid, message: claimError.message })
      }
    } catch (err) {
      // 예기치 못한 throw(네트워크 등)에도 500 대신 안전 복귀 — 로그인 착지 페이지는 깨지지 않게.
      console.error("auth callback 실패", err)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}

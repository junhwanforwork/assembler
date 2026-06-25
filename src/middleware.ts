import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// @supabase/ssr 표준 — 매 요청 getUser()로 만료 임박 토큰을 갱신해 쿠키를 최신화한다.
// 익명 우선 앱이라 보호 리다이렉트는 하지 않는다(로그인 강제 없음). 세션 없으면 getUser는 no-op.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  // 정적 자산·이미지 제외 — 그 외 모든 경로에서 세션 갱신.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

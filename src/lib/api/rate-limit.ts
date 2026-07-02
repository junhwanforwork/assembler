import { NextResponse } from "next/server"
import type { AssemblerClient } from "@/lib/supabase/assembler"

// ASM-001 — 유료 Anthropic 호출 라우트의 세션 단위 rate limit.
// 저장소 = Supabase 카운터 RPC(check_rate_limit, 20260702000002) — 인프라 교체 시 이 파일만 바꾼다.
// RPC 오류는 fail-open(허용 + 서버 로그): rate limit 인프라 장애가 제품 기능을 죽이면 안 된다.

export type RateLimitRoute = "generate" | "files" | "suggestions" | "note"

// 생성 계열(opus 대형 호출)은 빡빡하게, 경량 계열(haiku·sonnet)은 여유 있게.
export const RATE_LIMITS: Record<RateLimitRoute, { perMinute: number; perHour: number }> = {
  generate: { perMinute: 5, perHour: 30 },
  files: { perMinute: 5, perHour: 30 },
  suggestions: { perMinute: 10, perHour: 60 },
  note: { perMinute: 10, perHour: 60 },
}

// IP 백스톱 — 세션 로테이션(요청마다 새 UUID) 우회 차단. NAT/사무실 공유 IP 를 고려해 세션 한도의 3배.
const IP_LIMITS: Record<RateLimitRoute, { perMinute: number; perHour: number }> = {
  generate: { perMinute: 15, perHour: 90 },
  files: { perMinute: 15, perHour: 90 },
  suggestions: { perMinute: 30, perHour: 180 },
  note: { perMinute: 30, perHour: 180 },
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

// Vercel 이 플랫폼 레벨에서 세팅하는 첫 홉 — 로컬/직접 접속엔 없을 수 있다(그 땐 IP 윈도 스킵).
function clientIp(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return ip && ip.length <= 45 ? ip : null
}

// RPC 반환: 0 = 허용, N > 0 = N초 후 재시도.
async function checkWindow(c: AssemblerClient, key: string, limit: number, windowSeconds: number): Promise<number> {
  const { data, error } = await c.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
  if (error) throw error
  return data ?? 0
}

export async function checkRateLimit(c: AssemblerClient, request: Request, sessionId: string, route: RateLimitRoute): Promise<RateLimitResult> {
  const { perMinute, perHour } = RATE_LIMITS[route]
  try {
    const minuteWait = await checkWindow(c, `${sessionId}:${route}:m`, perMinute, 60)
    if (minuteWait > 0) return { ok: false, retryAfterSeconds: minuteWait }
    const hourWait = await checkWindow(c, `${sessionId}:${route}:h`, perHour, 3600)
    if (hourWait > 0) return { ok: false, retryAfterSeconds: hourWait }

    // 세션 키는 클라이언트가 로테이션할 수 있다 — IP 윈도가 그 우회를 막는다.
    const ip = clientIp(request)
    if (ip) {
      const ipLimits = IP_LIMITS[route]
      const ipMinuteWait = await checkWindow(c, `ip:${ip}:${route}:m`, ipLimits.perMinute, 60)
      if (ipMinuteWait > 0) return { ok: false, retryAfterSeconds: ipMinuteWait }
      const ipHourWait = await checkWindow(c, `ip:${ip}:${route}:h`, ipLimits.perHour, 3600)
      if (ipHourWait > 0) return { ok: false, retryAfterSeconds: ipHourWait }
    }
    return { ok: true }
  } catch (err) {
    console.error("[rate-limit] fail-open:", err)
    return { ok: true }
  }
}

// 429 응답 — Retry-After 헤더 포함(초 단위). 에러 포맷은 api.md 규칙({ error } + status) 유지.
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}

import { NextResponse } from "next/server"

// 라우트 공통 응답·요청 헬퍼. 에러 포맷은 api.md 규칙: { error: 'snake_case_reason' } + status.

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status })
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// 비로그인 소유권은 x-session-id 헤더(localStorage UUID)로 판별한다.
export function getSessionId(request: Request): string | null {
  const id = request.headers.get("x-session-id")
  return id && id.trim().length > 0 ? id : null
}

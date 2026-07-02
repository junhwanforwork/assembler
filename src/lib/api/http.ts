import { NextResponse } from "next/server"

// 라우트 공통 응답·요청 헬퍼. 에러 포맷은 api.md 규칙: { error: 'snake_case_reason' } + status.

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status })
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// 500 관측성 — 클라이언트 응답(snake_case 코드)은 그대로 두고 서버 로그만 남긴다.
// scope 는 라우트 경로 — 프로덕션 500 이 어느 핸들러에서 났는지 추적용.
export function jsonServerError(scope: string, err: unknown): NextResponse {
  console.error(`[api:${scope}]`, err)
  return jsonError("server_error", 500)
}

// 아이디어 프롬프트 상한 — 무한 길이 입력이 opus(16k 토큰) 호출로 그대로 흘러가 비용/DoS 되는 걸 막는다.
export const MAX_IDEA_LENGTH = 4000

// 비로그인 소유권은 x-session-id 헤더(localStorage UUID)로 판별한다.
export function getSessionId(request: Request): string | null {
  const id = request.headers.get("x-session-id")
  return id && id.trim().length > 0 ? id : null
}

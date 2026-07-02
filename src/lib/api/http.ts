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

// Content-Length 선제 게이트 — request.json()이 거대 body를 통째로 버퍼링하기 전에 컷(메모리/CPU 방어).
// 헤더 없는(chunked) 요청은 통과 — 파서의 직렬화 바이트 캡이 최종 방어선.
export function contentLengthExceeds(request: Request, maxBytes: number): boolean {
  const len = Number(request.headers.get("content-length"))
  return Number.isFinite(len) && len > maxBytes
}

// 비로그인 소유권은 x-session-id 헤더(localStorage UUID)로 판별한다.
// UUID 형식 강제(ASM-001) — 임의 문자열이 RLS 비교·rate limit 키로 흘러드는 걸 차단.
// 정상 클라이언트는 crypto.randomUUID()(session.ts, 레거시 howcloud 키 포함)라 영향 없음.
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getSessionId(request: Request): string | null {
  const id = request.headers.get("x-session-id")
  return id && SESSION_ID_PATTERN.test(id) ? id : null
}

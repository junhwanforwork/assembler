import { type Page } from "@playwright/test"

// 비로그인 세션 시드 — getSessionId(src/lib/session.ts)가 읽는 localStorage 키에
// 고정 id를 페이지 로드 전에 주입한다. (RLS는 x-session-id 헤더 기반이라 동일 id로 시드/조회 일관)
// 서버 getSessionId 가 UUID 형식을 강제하므로(ASM-001) 시드도 유효 UUID 여야 실 API 경로가 통과한다.
const SESSION_KEY = "assembler_session_id"

export async function seedSession(page: Page, sessionId = "e2e00000-0000-4000-8000-000000000000"): Promise<void> {
  await page.addInitScript(
    ([key, id]) => {
      try {
        localStorage.setItem(key, id)
      } catch {}
    },
    [SESSION_KEY, sessionId] as const
  )
}

// 프로젝트 목록 GET을 고정 응답으로 — Supabase 의존 제거(결정적·격리). 비-GET(생성 등)은 통과.
export async function mockProjects(page: Page, projects: unknown[] = []): Promise<void> {
  await page.route("**/api/projects", (route) => {
    if (route.request().method() !== "GET") return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ projects }),
    })
  })
}

// 생성(/api/generate, opus) 호출을 가로채 고정 그래프로 응답 — AI 호출 0 원칙.
// 생성 "배선"(홈 아이디어→그래프→프로젝트 오픈)을 비용 없이 검증할 때 사용.
export async function mockGenerate(page: Page, graph: Record<string, unknown>): Promise<void> {
  await page.route("**/api/generate", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ graph }) })
  )
}

// 스트리밍 생성(ASS-204) 모킹 — SSE 프레임을 한 번에 fulfill(클라 리더가 \n\n 경계로 분해). AI 호출 0.
export async function mockGenerateStream(page: Page, frames: unknown[]): Promise<void> {
  await page.route("**/api/generate", (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    const body = frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join("")
    return route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body,
    })
  })
}

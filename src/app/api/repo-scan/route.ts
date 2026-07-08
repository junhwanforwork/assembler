import { createAssemblerClient } from "@/lib/supabase/assembler"
import { contentLengthExceeds, getSessionId, jsonError, jsonOk, jsonServerError } from "@/lib/api/http"
import { checkRateLimit, rateLimitedResponse } from "@/lib/api/rate-limit"
import { parseRepoUrl } from "@/lib/repo-clone/url"
import { scanGitRepo } from "@/lib/repo-clone/scan"
import { CloneError } from "@/lib/repo-clone/clone"

// ASM-061 — 깃 주소 → 얕은 클론 → 추출 결과 반환. 저장하지 않는다(미리보기 원칙 —
// 저장은 기존 싱크-인 채널 몫). 클론 60s + 읽기가 내부 타임아웃이라 maxDuration이 항상 더 크다.
export const maxDuration = 120

// body는 { gitUrl } 하나 — 이보다 큰 요청은 파싱 전에 컷.
const MAX_BODY_BYTES = 4 * 1024

export async function POST(request: Request) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)

  if (contentLengthExceeds(request, MAX_BODY_BYTES)) return jsonError("payload_too_large", 413)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }

  const gitUrl = (body as { gitUrl?: unknown } | null)?.gitUrl
  const parsed = parseRepoUrl(gitUrl)
  if (!parsed.ok) return jsonError("invalid_repo_url", 400)

  const c = await createAssemblerClient(sessionId)

  // 클론은 네트워크·디스크·시간을 크게 먹는다 — 검증 통과분만 sync 카운터(기존 scope 재사용)로 계량.
  const rl = await checkRateLimit(c, request, sessionId, "sync")
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSeconds)

  try {
    const result = await scanGitRepo(parsed.url)
    return jsonOk({ result })
  } catch (err) {
    if (err instanceof CloneError) {
      // 원문(stderr)은 클라이언트에 노출하지 않는다 — URL·요약만 서버 로그.
      console.error("[api:repo-scan] clone failed:", parsed.url, (err as Error).message)
      return jsonError("clone_failed", 502)
    }
    return jsonServerError("repo-scan", err)
  }
}

import { execFile } from "node:child_process"
import { promisify } from "node:util"

// ASM-061 — 얕은 클론 실행기. URL은 화이트리스트(url.ts) 통과분만 받고,
// 셸을 거치지 않는 execFile 인자 배열로만 전달한다(인젝션 원천 차단).
// GIT_TERMINAL_PROMPT=0 — 비공개 레포의 인증 프롬프트로 행이 걸리는 걸 차단(공개 레포만 지원).

const execFileAsync = promisify(execFile)

export const CLONE_TIMEOUT_MS = 60_000

// stderr 원문은 담지 않는다 — 클라이언트 응답은 clone_failed뿐, 상세는 서버 로그(라우트)가 요약만 남긴다.
export class CloneError extends Error {
  constructor(detail: string) {
    super(`git clone failed (${detail})`)
    this.name = "CloneError"
  }
}

export async function cloneRepo(url: string, dir: string): Promise<void> {
  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--single-branch", url, dir], {
      timeout: CLONE_TIMEOUT_MS,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    })
  } catch (err) {
    const e = err as { code?: number | string; killed?: boolean; signal?: string }
    throw new CloneError(e.killed ? `timeout ${e.signal ?? ""}`.trim() : `exit ${e.code ?? "unknown"}`)
  }
}

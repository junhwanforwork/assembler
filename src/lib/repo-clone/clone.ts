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
    // --filter=blob:limit=1m — depth 1은 히스토리만 제한, 대용량 blob이 임시 볼륨을 채우는 건 blob 캡이 막는다.
    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--single-branch", "--filter=blob:limit=1m", url, dir],
      {
        timeout: CLONE_TIMEOUT_MS,
        // 최소 권한 — 서비스 키가 실린 process.env 전체를 자식 프로세스에 넘기지 않는다.
        // 캐스트: 전역 ProcessEnv 증강이 NODE_ENV를 필수로 요구하지만, 여기선 의도적으로 뺀 최소 env다.
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          GIT_TERMINAL_PROMPT: "0",
        } as unknown as NodeJS.ProcessEnv,
      },
    )
  } catch (err) {
    const e = err as { code?: number | string; killed?: boolean; signal?: string }
    throw new CloneError(e.killed ? `timeout ${e.signal ?? ""}`.trim() : `exit ${e.code ?? "unknown"}`)
  }
}

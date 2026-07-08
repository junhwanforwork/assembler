// ── 레인 1(ASM-060) 계약 브리지 — 병행 개발용 ──
// src/lib/repo-extract는 레인 1 소유라 이 브랜치에는 아직 없다. 통합 시 아래 스텁 본문을
// 지우고 이 한 줄로 교체한다(임포트 지점은 이 파일 하나뿐):
//   export { extractRepo, isBlockedPath, type ExtractResult, type ExtractReport } from "@/lib/repo-extract"
// 스텁은 계약 시그니처만 지킨다 — 추출은 항상 빈 결과(가짜 데이터 금지), 차단은 최소 집합.

import type { SyncPayload } from "./code-connect"

export type ExtractReport = { scannedCount: number; blockedPaths: string[]; skippedPaths: string[] }
export type ExtractResult = { payload: SyncPayload; report: ExtractReport }

// env·키·크레덴셜 최소 집합 — 실물(레인 1)의 차단 목록이 이보다 넓어도 안전 방향(더 많이 차단)이다.
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /(^|\/)\.env(\.|$)/,
  /\.(pem|key|p12|pfx)$/,
  /(^|\/)credentials?(\.|\/|$)/i,
  /(^|\/)secrets?(\.|\/|$)/i,
]

export function isBlockedPath(path: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(path))
}

export function extractRepo(files: { path: string; text: string }[]): ExtractResult {
  return {
    payload: { apis: [], tables: [] },
    report: { scannedCount: files.length, blockedPaths: [], skippedPaths: [] },
  }
}

// ⚠ 레인 2 임시 스텁 — 통합 시 레인 1(ASM-060) 실물로 대체한다. 계약 시그니처(11차 패킷 동결)만 유지.
// 추출 로직은 레인 1 소유 — 여기선 빈 payload에 스캔 수만 정직하게 센다(지어내지 않음).

import type { ExtractResult, RepoFileInput } from "./types"

export function extractRepo(files: RepoFileInput[]): ExtractResult {
  return {
    payload: { apis: [], tables: [] },
    report: { scannedCount: files.length, blockedPaths: [], skippedPaths: [] },
  }
}

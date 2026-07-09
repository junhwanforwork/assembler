// ── 레인 1(ASM-060) 계약 브리지 ──
// 병행 개발 기간의 스텁을 통합(11차)에서 실물 재수출로 교체했다.
// dashboard가 repo-extract를 소비하는 유일한 지점 — 실물 시그니처가 바뀌면 여기서 어댑트한다.

export { extractRepo } from "@/lib/repo-extract/extract"
export { isBlockedPath } from "@/lib/repo-extract/blocklist"
export type { ExtractResult, ExtractReport, MarkdownDoc } from "@/lib/repo-extract/types"

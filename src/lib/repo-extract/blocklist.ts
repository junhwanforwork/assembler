// ⚠ 레인 2 임시 스텁 — 통합 시 레인 1(ASM-060) 실물로 대체한다. 계약 시그니처(11차 패킷 동결)만 유지.
// 최소 동작: 레인 1 명세의 핵심 차단(민감 파일·거대 디렉토리)만 — 실물이 이보다 넓어진다.

const BLOCKED_SEGMENTS = new Set([".git", "node_modules", ".next"])
const BLOCKED_FILE_PATTERN = /(^|\/)\.env[^/]*$|\.(pem|key)$|credential|secret|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i

export function isBlockedPath(path: string): boolean {
  if (path.split("/").some((seg) => BLOCKED_SEGMENTS.has(seg))) return true
  return BLOCKED_FILE_PATTERN.test(path)
}

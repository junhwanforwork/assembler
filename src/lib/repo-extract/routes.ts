import type { ApiSyncInput } from "@/lib/api/validate-sync"
import type { HttpMethod } from "@/lib/types/assembler"
import type { RepoFileInput } from "./types"

// Next App Router 라우트 추출 — 정규식 수준(AST 금지, 패킷 §②).
// 라인 시작 기준 매칭으로 주석·들여쓴 문자열 속 오탐을 피한다. summary는 코드에서
// 확인된 사실이 아니므로 빈 문자열(설명은 12차 API 해석 AI 몫).

const FN_EXPORT = /^export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/
const CONST_EXPORT = /^export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/

export function isRouteFilePath(path: string): boolean {
  return routeEndpoint(path) !== null
}

// 파일 경로 → 엔드포인트. app 세그먼트 뒤를 취하고 route group("(...)")은 URL에서
// 사라지므로 제거, 동적 세그먼트([id])는 표기 유지.
function routeEndpoint(path: string): string | null {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  if (last !== "route.ts" && last !== "route.js") return null
  const appIndex = segments.indexOf("app")
  if (appIndex === -1) return null
  const between = segments
    .slice(appIndex + 1, -1)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
  return `/${between.join("/")}`
}

export function extractNextRoutes(files: RepoFileInput[]): ApiSyncInput[] {
  const out: ApiSyncInput[] = []
  // 같은 method+endpoint는 서버 upsert 키 중복(21000)을 만들므로 한 번만 담는다.
  const seen = new Set<string>()
  for (const file of files) {
    const endpoint = routeEndpoint(file.path)
    if (endpoint === null) continue
    for (const line of file.text.split("\n")) {
      const match = FN_EXPORT.exec(line) ?? CONST_EXPORT.exec(line)
      if (!match) continue
      const method = match[1] as HttpMethod
      const key = `${method} ${endpoint}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ method, endpoint, summary: "", status: "active", source: "code" })
    }
  }
  return out
}

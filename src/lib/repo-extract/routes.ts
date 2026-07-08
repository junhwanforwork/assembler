import type { ApiSyncInput } from "@/lib/api/validate-sync"
import type { HttpMethod } from "@/lib/types/assembler"
import type { RepoFileInput } from "./types"

// Next App Router 라우트 추출 — 정규식 수준(AST 금지, 패킷 §②).
// 라인 시작 기준 매칭으로 주석·들여쓴 문자열 속 오탐을 피한다. summary는 코드에서
// 확인된 사실이 아니므로 빈 문자열(설명은 12차 API 해석 AI 몫).

const FN_EXPORT = /^export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/
const CONST_EXPORT = /^export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/
// re-export(export { GET } from "./impl") — 크로스체크 정정: 조용한 누락 금지
const BRACE_EXPORT = /^export\s*\{([^}]*)\}/
const METHOD_TOKEN = /\b(GET|POST|PUT|PATCH|DELETE)\b/g

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

function methodsInFile(text: string): HttpMethod[] {
  const found = new Set<HttpMethod>()
  for (const line of text.split("\n")) {
    const single = FN_EXPORT.exec(line) ?? CONST_EXPORT.exec(line)
    if (single) {
      found.add(single[1] as HttpMethod)
      continue
    }
    const braces = BRACE_EXPORT.exec(line)
    if (!braces) continue
    for (const token of braces[1].matchAll(METHOD_TOKEN)) {
      found.add(token[1] as HttpMethod)
    }
  }
  return [...found]
}

export function extractNextRoutes(files: RepoFileInput[]): ApiSyncInput[] {
  const out: ApiSyncInput[] = []
  // 같은 method+endpoint는 서버 upsert 키 중복(21000)을 만들므로 한 번만 담는다.
  const seen = new Set<string>()
  for (const file of files) {
    const endpoint = routeEndpoint(file.path)
    if (endpoint === null) continue
    for (const method of methodsInFile(file.text)) {
      const key = `${method} ${endpoint}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ method, endpoint, summary: "", status: "active", source: "code" })
    }
  }
  return out
}

// 라우트 파일인데 인식된 메서드가 0이면 조용히 사라진다 — 호출자가 capNotes로
// 정직 보고할 수 있게 경로를 돌려준다 (크로스체크 정정).
export function findMethodlessRoutePaths(files: RepoFileInput[]): string[] {
  return files
    .filter((f) => isRouteFilePath(f.path) && methodsInFile(f.text).length === 0)
    .map((f) => f.path)
}

import type { ProjectGraph, Api } from "@/lib/types/assembler"
import { apiUsedBy } from "@/lib/graph/selectors"

// API Catalog 파생 헬퍼 (ASS-080) — 비개발자용 카탈로그 테이블의 행 데이터를 그래프에서 계산한다.
// 모델 갭(name·timestamp·request/response 스키마 없음)은 여기서 파생/플레이스홀더로 메운다.
// 순수 함수만 — 컴포넌트는 이 결과를 표시만 한다.

/** method → 읽기 쉬운 동사 (모델에 name이 없어 파생). */
const METHOD_VERB: Record<Api["method"], string> = {
  GET: "Get",
  POST: "Create",
  PUT: "Update",
  PATCH: "Update",
  DELETE: "Delete",
}

/** "users" → "User", "categories" → "Category" 식 단순 단수화. 영어 리소스명 휴리스틱. */
function singularize(word: string): string {
  if (word.length <= 2) return word
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`
  if (word.endsWith("sses") || word.endsWith("ches") || word.endsWith("shes") || word.endsWith("xes")) {
    return word.slice(0, -2)
  }
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1)
  return word
}

/** path 마지막 리소스 세그먼트를 사람이 읽는 단어로. ":id"·"{id}" 같은 파라미터 세그먼트는 건너뛴다. */
function lastResource(path: string): string {
  const segments = path.split("/").filter((s) => s.length > 0 && !s.startsWith(":") && !s.startsWith("{"))
  const last = segments[segments.length - 1] ?? ""
  return last.replace(/[-_]+/g, " ").trim()
}

/** Title Case — "user profile" → "User Profile". */
function titleCase(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** 읽기 쉬운 API 이름을 method+path에서 파생 (모델에 name 필드 없음).
 *  예: POST /users → "Create User", GET /posts/:id → "Get Post". 리소스가 비면 method만. */
export function deriveApiName(api: Api): string {
  const verb = METHOD_VERB[api.method]
  const resource = lastResource(api.path)
  if (resource.length === 0) return verb
  return `${verb} ${titleCase(singularize(resource))}`
}

/** "method path" 한 줄 — 복사·mono 표시용. 예: "POST /users". */
export function endpointText(api: Api): string {
  return `${api.method} ${api.path}`
}

/** 이 API를 쓰는 페이지 이름 + 이 API를 참조하는 Feature 이름 (Used in 컬럼). */
export function apiUsedInLabels(graph: ProjectGraph, apiId: string): string[] {
  const { pageIds } = apiUsedBy(graph, apiId)
  const labels: string[] = []
  for (const pid of pageIds) {
    const page = graph.pages.find((p) => p.id === pid)
    if (page) labels.push(page.name)
  }
  for (const feature of graph.features) {
    if (feature.apiIds.includes(apiId)) labels.push(feature.name)
  }
  // 페이지·기능 이름이 겹칠 일은 적지만 안전하게 dedup.
  return [...new Set(labels)]
}

/** 이 API를 호출하는 UI 액션 라벨 (Trigger 컬럼). 예: "Login Button · Click". */
export function apiTriggerLabels(graph: ProjectGraph, apiId: string): string[] {
  const { elementIds } = apiUsedBy(graph, apiId)
  const labels: string[] = []
  for (const eid of elementIds) {
    const el = graph.uiElements.find((e) => e.id === eid)
    if (!el) continue
    const action = el.action.trim()
    labels.push(action.length > 0 ? `${el.name} · ${action}` : el.name)
  }
  return labels
}

/** error 문자열을 칩 배열로 — 구분자(쉼표·가운뎃점·줄바꿈)가 있으면 split, 없으면 단일 칩. */
export function errorChips(error: string): string[] {
  const trimmed = error.trim()
  if (trimmed.length === 0) return []
  return trimmed
    .split(/[,·\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** databaseIds → 테이블 이름 (Database 컬럼). 누락 id는 건너뛴다. */
export function apiDatabaseLabels(graph: ProjectGraph, api: Api): string[] {
  return api.databaseIds
    .map((did) => graph.databases.find((d) => d.id === did)?.name)
    .filter((n): n is string => Boolean(n))
}

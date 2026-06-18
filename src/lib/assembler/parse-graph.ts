import type { ProjectGraph } from "@/lib/types/assembler"

// 모델 출력 텍스트 → ProjectGraph. 프롬프트는 순수 JSON을 요구하지만(assembler.ts OUTPUT),
// 가끔 코드펜스/앞뒤 잡텍스트가 섞이므로 방어적으로 추출 후 형태를 검증한다.
// 깊은 무결성 정규화(dangling 참조 보정 등)는 ASS-019 — 여기선 컬렉션 형태만 본다.

export class GraphParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GraphParseError"
  }
}

// ProjectGraph 직렬화 루트의 필수 배열 컬렉션 — 형태 가드의 단일 기준.
const COLLECTION_KEYS = [
  "requirements",
  "features",
  "pages",
  "wireframes",
  "uiElements",
  "apis",
  "databases",
  "pageFlows",
] as const

// 코드펜스/앞뒤 텍스트를 걷어내고 최상위 JSON 객체 구간만 남긴다.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fenced ? fenced[1] : raw).trim()
  const start = body.indexOf("{")
  const end = body.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new GraphParseError("생성 결과에서 JSON을 찾지 못했어요")
  }
  return body.slice(start, end + 1)
}

export function parseProjectGraph(raw: string): ProjectGraph {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    throw new GraphParseError("생성 결과 JSON 형식이 올바르지 않아요")
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new GraphParseError("생성 결과가 객체가 아니에요")
  }
  const obj = parsed as Record<string, unknown>

  if (typeof obj.id !== "string" || typeof obj.name !== "string") {
    throw new GraphParseError("생성 결과에 프로젝트 식별자가 없어요")
  }
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(obj[key])) {
      throw new GraphParseError(`생성 결과에 ${key} 컬렉션이 없어요`)
    }
  }
  // userFlow는 단일 객체(edges 배열) — 누락 시 빈 그래프로 보정(균질 직렬화 원칙).
  const userFlow = obj.userFlow as { id?: unknown; edges?: unknown } | undefined
  if (!userFlow || !Array.isArray(userFlow.edges)) {
    obj.userFlow = { id: "uf", edges: [] }
  }

  return obj as unknown as ProjectGraph
}

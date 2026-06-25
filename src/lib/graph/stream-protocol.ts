import type { ProjectGraph } from "@/lib/types/assembler"

// ASS-204 스트리밍 프로토콜 — 서버↔클라 단일 출처 envelope.
// 모델이 그래프를 레이어별 1줄 minified JSON(NDJSON)으로 방출 → 서버가 누적 그래프를
// normalizeGraph 후 레이어마다 스냅샷을 SSE로 보낸다. 클라는 순수 replace(mergeLayer).

export const LAYER_ORDER = ["meta", "requirements", "pages", "apidata", "userflow"] as const
export type LayerName = (typeof LAYER_ORDER)[number]

// 레이어별 컬렉션 키 — 모델이 어느 레이어에 무엇을 싣는지의 단일 출처(프롬프트와 동기).
const LAYER_KEYS: Record<LayerName, readonly string[]> = {
  meta: [],
  requirements: ["requirements", "features"],
  pages: ["pages", "wireframes", "uiElements", "pageFlows"],
  apidata: ["apis", "databases"],
  userflow: [],
}

// 모든 컬렉션 키(병합 대상). userFlow는 객체라 별도 처리.
const ALL_COLLECTION_KEYS = [
  "requirements",
  "features",
  "pages",
  "wireframes",
  "uiElements",
  "pageFlows",
  "apis",
  "databases",
] as const

// 모델이 방출하는 레이어 1줄(부분 그래프). 키는 ASSEMBLER_OUTPUT_SHAPE의 부분집합.
export interface RawLayer {
  layer: LayerName
  id?: string
  name?: string
  description?: string
  requirements?: unknown[]
  features?: unknown[]
  pages?: unknown[]
  wireframes?: unknown[]
  uiElements?: unknown[]
  pageFlows?: unknown[]
  apis?: unknown[]
  databases?: unknown[]
  userFlow?: unknown
}

// 서버→클라 SSE envelope. graph는 이미 정규화된 누적 스냅샷.
export type GraphStreamEvent =
  | { type: "layer"; layer: LayerName; graph: ProjectGraph }
  | { type: "done"; graph: ProjectGraph }
  | { type: "error"; message: string }

// 한 줄이 유효한 RawLayer인지 — layer 키가 LAYER_ORDER 안에 있는지로 판정.
export function isRawLayer(value: unknown): value is RawLayer {
  if (typeof value !== "object" || value === null) return false
  const layer = (value as { layer?: unknown }).layer
  return typeof layer === "string" && (LAYER_ORDER as readonly string[]).includes(layer)
}

// 누적 raw 그래프에 레이어를 병합(배열 concat·meta 덮어쓰기). 정규화는 호출측(normalizeGraph) 책임.
export function mergeRawLayer(
  acc: Record<string, unknown>,
  layer: RawLayer,
): Record<string, unknown> {
  const next = { ...acc }
  if (layer.id !== undefined) next.id = layer.id
  if (layer.name !== undefined) next.name = layer.name
  if (layer.description !== undefined) next.description = layer.description
  for (const key of ALL_COLLECTION_KEYS) {
    const incoming = layer[key]
    if (Array.isArray(incoming)) {
      const prev = Array.isArray(next[key]) ? (next[key] as unknown[]) : []
      next[key] = [...prev, ...incoming]
    }
  }
  if (layer.userFlow !== undefined) next.userFlow = layer.userFlow
  return next
}

// 레이어가 자기 책임 키 중 하나라도 실었는지 — 빈 레이어(meta/userflow 누락) 스킵 판정용.
export function layerCarriesData(layer: RawLayer): boolean {
  if (layer.layer === "meta") return layer.id !== undefined || layer.name !== undefined
  if (layer.layer === "userflow") return layer.userFlow !== undefined
  const record = layer as unknown as Record<string, unknown>
  return LAYER_KEYS[layer.layer].some((k) => Array.isArray(record[k]))
}

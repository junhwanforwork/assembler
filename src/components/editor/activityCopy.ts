import type { ActivityType } from "@/lib/types/assembler"
import type { CollectionKey } from "@/lib/assembler/diff"

// 활동 타임라인 카피 조합(ASM-024) — BE는 type+metadata 사실만 기록하고, 해요체 문구는 여기서 만든다.
// metadata 는 Record<string, unknown> 그대로 오므로(과거 행 호환) 형태를 믿지 않고 좁혀 읽는다.

const COLLECTION_LABEL: Record<CollectionKey, string> = {
  requirements: "요구사항",
  features: "기능",
  pages: "페이지",
  flows: "플로우",
  wireframes: "와이어프레임",
  elements: "요소",
}

const COLLECTION_ORDER: CollectionKey[] = ["requirements", "features", "pages", "flows", "wireframes", "elements"]

type ChangeCounts = { added: number; removed: number; modified: number }

// DesignDelta(id 배열)와 DeltaCounts(정수)를 한 형태로 — 배열이면 길이, 숫자면 그대로.
function readCount(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  return 0
}

function readCollection(value: unknown): ChangeCounts {
  if (typeof value !== "object" || value === null) return { added: 0, removed: 0, modified: 0 }
  const record = value as Record<string, unknown>
  return { added: readCount(record.added), removed: readCount(record.removed), modified: readCount(record.modified) }
}

// 델타 → "기능 1개 수정 · 페이지 1개 추가" 한 줄. truncated(개수 요약)도 같은 형식.
// 변경이 없거나 형태를 못 읽으면 빈 문자열 — 호출부가 대체 문구를 정한다.
export function summarizeDelta(delta: unknown): string {
  if (typeof delta !== "object" || delta === null) return ""
  const record = delta as Record<string, unknown>
  const collections = record.collections
  if (typeof collections !== "object" || collections === null) return ""

  const segments: string[] = []
  for (const key of COLLECTION_ORDER) {
    const counts = readCollection((collections as Record<string, unknown>)[key])
    const label = COLLECTION_LABEL[key]
    if (counts.added > 0) segments.push(`${label} ${counts.added}개 추가`)
    if (counts.removed > 0) segments.push(`${label} ${counts.removed}개 삭제`)
    if (counts.modified > 0) segments.push(`${label} ${counts.modified}개 수정`)
  }

  const linkCount = readCount(record.links)
  if (linkCount > 0) segments.push(`연결 ${linkCount}곳 변경`)

  return segments.join(" · ")
}

export type ActivityLine = { title: string; name: string | null }

function readName(metadata: Record<string, unknown>): string | null {
  return typeof metadata.name === "string" && metadata.name.length > 0 ? metadata.name : null
}

export function activityLine(type: ActivityType, metadata: Record<string, unknown>): ActivityLine {
  const name = readName(metadata)
  switch (type) {
    case "workspace_created":
      return { title: "새 스펙을 만들었어요", name }
    case "workspace_renamed":
      return { title: "스펙 이름을 바꿨어요", name }
    case "workspace_deleted":
      return { title: "스펙을 삭제했어요", name }
    case "design_updated":
      return { title: summarizeDelta(metadata.delta) || "설계를 저장했어요", name }
    case "file_generated":
      return { title: "AI가 설계 초안을 만들었어요", name }
    case "apis_synced": {
      const count = readCount(metadata.count)
      return { title: count > 0 ? `API ${count}개를 코드에서 가져왔어요` : "API를 코드에서 가져왔어요", name: null }
    }
    case "db_tables_synced": {
      const count = readCount(metadata.count)
      return {
        title: count > 0 ? `DB 테이블 ${count}개를 코드에서 가져왔어요` : "DB 테이블을 코드에서 가져왔어요",
        name: null,
      }
    }
  }
}

// 상대 시간 — 7일 안은 상대 표기, 그 밖은 날짜(연도는 다를 때만). 미래·파싱 불가는 "방금 전".
export function relativeTime(iso: string, now: Date): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return "방금 전"
  const diffSeconds = Math.floor((now.getTime() - time) / 1000)
  if (diffSeconds < 60) return "방금 전"
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`
  if (diffSeconds < 86400 * 7) return `${Math.floor(diffSeconds / 86400)}일 전`

  const date = new Date(time)
  const monthDay = `${date.getMonth() + 1}월 ${date.getDate()}일`
  return date.getFullYear() === now.getFullYear() ? monthDay : `${date.getFullYear()}년 ${monthDay}`
}

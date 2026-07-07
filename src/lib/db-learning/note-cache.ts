import type { DbTableNote } from "@/lib/types/assembler"

// ASM-056 ⑦ — 문서 종류 전환마다 노트 GET 전량 재발사를 막는 워크스페이스 단위 메모리 캐시.
// 세션 한정(모듈 스코프 Map)·과설계 금지: TTL·용량 관리 없음, 무효화는 노트 재생성/편집 시 명시 호출.
// "노트 없음"(null)도 유효한 값 — 미캐시(undefined)와 구분해 없는 노트의 재발사도 막는다.

const cache = new Map<string, Map<string, DbTableNote | null>>()

export function getCachedNote(workspaceId: string, tableId: string): DbTableNote | null | undefined {
  return cache.get(workspaceId)?.get(tableId)
}

export function setCachedNote(workspaceId: string, tableId: string, note: DbTableNote | null): void {
  let byTable = cache.get(workspaceId)
  if (!byTable) {
    byTable = new Map()
    cache.set(workspaceId, byTable)
  }
  byTable.set(tableId, note)
}

export function invalidateCachedNote(workspaceId: string, tableId: string): void {
  cache.get(workspaceId)?.delete(tableId)
}

export function clearNoteCache(): void {
  cache.clear()
}

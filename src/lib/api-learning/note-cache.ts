import type { ApiNote } from "@/lib/types/assembler"

// ASM-064 — 데이터 뷰 재진입·세그먼트 전환마다 노트 GET 전량 재발사를 막는 워크스페이스 단위 메모리 캐시
// (db-learning note-cache 미러). 세션 한정(모듈 스코프 Map)·과설계 금지: TTL·용량 관리 없음.
// "노트 없음"(null)도 유효한 값 — 미캐시(undefined)와 구분해 없는 노트의 재발사도 막는다.
//
// 서버 유입 가드(ASM-059 ① 교훈 선반영): client-only 패키지가 미설치라 기능 가드로 대체 —
// 서버(window 없음)에서는 읽기=미캐시·쓰기=no-op. SSR·서버 모듈이 실수로 import 해도
// 모듈 스코프 Map이 요청 간(세션 교차) 공유 상태가 되지 않는다.

const cache = new Map<string, Map<string, ApiNote | null>>()

function isServer(): boolean {
  return typeof window === "undefined"
}

export function getCachedApiNote(workspaceId: string, apiId: string): ApiNote | null | undefined {
  if (isServer()) return undefined
  return cache.get(workspaceId)?.get(apiId)
}

export function setCachedApiNote(workspaceId: string, apiId: string, note: ApiNote | null): void {
  if (isServer()) return
  let byApi = cache.get(workspaceId)
  if (!byApi) {
    byApi = new Map()
    cache.set(workspaceId, byApi)
  }
  byApi.set(apiId, note)
}

export function invalidateCachedApiNote(workspaceId: string, apiId: string): void {
  if (isServer()) return
  cache.get(workspaceId)?.delete(apiId)
}

export function clearApiNoteCache(): void {
  cache.clear()
}

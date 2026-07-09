import type { Api, DbTable } from "@/lib/types/assembler"

// 정책 문서(ASM-069) 순수 헬퍼 — 파일명 정제·참조 해석. API 호출·상태 없음(테스트 대상).
// 브리지(usePolicyDoc)와 뷰(PolicyView)가 공유한다.

// md 다운로드 파일명 — 파일시스템 금지 문자 정제(ExportModal.tsx download 로직과 동일 정제식).
// 빈 제목은 브라우저 임의 파일명에 맡기지 않고 고정 대체어를 쓴다.
export function policyDocFilename(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|\n\r]/g, "-").trim()
  return `${cleaned || "정책-문서"}.md`
}

// 참조 해석 — 저장된 id 중 실재하는 것만 원본 목록 순서로 돌려준다(코드-진실, 지어내기 금지).
// 삭제된 API·테이블을 가리키는 잔재 id는 조용히 걸러 화면에 유령 참조를 만들지 않는다.
export function resolveApiRefs(apiIds: readonly string[], apis: readonly Api[]): Api[] {
  const wanted = new Set(apiIds)
  return apis.filter((a) => wanted.has(a.id))
}

export function resolveDbRefs(dbTableIds: readonly string[], dbTables: readonly DbTable[]): DbTable[] {
  const wanted = new Set(dbTableIds)
  return dbTables.filter((t) => wanted.has(t.id))
}

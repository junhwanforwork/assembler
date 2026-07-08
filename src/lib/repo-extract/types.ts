import type { SyncPayload } from "@/components/dashboard/code-connect"

// ASM-060 계약 타입 (동결 — 레인 2·3이 이 시그니처로 병행 개발).
// path는 레포 루트 기준 상대경로.
export type RepoFileInput = { path: string; text: string }

// scannedCount = 차단 제외하고 실제 검토한 파일 수.
// blockedPaths = 차단 목록에 걸린 입력(이중 방어 — 호출자가 걸렀어도 재확인).
// skippedPaths = 검토했지만 어떤 추출기도 소비하지 않은 파일(추출 대상 아님 · 1순위에 밀린 소스).
// capNotes = 동결 3필드엔 캡 초과 사유를 담을 곳이 없어 추가한 optional 필드 —
// 패킷 §③ "초과분은 skippedPaths가 아니라 별도 사유로 남기고 컷(조용한 누락 금지)".
// optional이라 동결 시그니처로 만든 소비자 코드·스텁과 호환된다.
export type ExtractReport = {
  scannedCount: number
  blockedPaths: string[]
  skippedPaths: string[]
  capNotes?: string[]
}

export type ExtractResult = { payload: SyncPayload; report: ExtractReport }

export type { SyncPayload }

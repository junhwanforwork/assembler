// ⚠ 레인 2 임시 스텁 — 통합 시 레인 1(ASM-060) 실물로 대체한다. 계약 시그니처(11차 패킷 동결)만 유지.
import type { SyncPayload } from "@/components/dashboard/code-connect"

export type RepoFileInput = { path: string; text: string }
export type ExtractReport = { scannedCount: number; blockedPaths: string[]; skippedPaths: string[] }
export type ExtractResult = { payload: SyncPayload; report: ExtractReport }

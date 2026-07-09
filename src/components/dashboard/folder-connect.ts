// 폴더 연결(ASM-062, F1-C) — 브라우저에서 고른 폴더를 읽기 전에 선별하는 순수 로직.
// File API 의존은 ReadableEntry(text 씽크)로 얇게 격리해 이 파일 전체를 유닛으로 검증한다.
// 보증: 차단 파일(env 등)은 후보 판정보다 먼저 걸러져 text()가 아예 호출되지 않는다 —
// "안 보낸다"가 아니라 "브라우저에서도 안 읽는다"가 F1-C의 안전 경계다.

import { isMarkdownDocPath } from "@/lib/repo-extract/docs"

export type FolderEntry = { path: string; size: number }
export type ReadableEntry = FolderEntry & { text: () => Promise<string> }

export type FolderSelection = {
  toRead: string[]
  blockedPaths: string[]
  skippedPaths: string[]
}

export type FolderReadResult = {
  files: { path: string; text: string }[]
  blockedPaths: string[]
  skippedPaths: string[]
  scannedCount: number
}

// 서버 싱크-인 바이트 캡(MAX_SYNC_BYTES)과 같은 512KB — 파일 하나가 페이로드 전체 캡을 넘는 걸 원천 차단.
export const MAX_EXTRACT_FILE_BYTES = 512 * 1024

// 추출 대상: Next App Router API(route.ts) · Supabase 타입(database.types.ts) · migrations/*.sql ·
// 기획 md 문서(ASM-070 — 판정은 isMarkdownDocPath 재사용, 게이트 불일치로 인한 조용한 누락 방지).
export function isExtractCandidate(path: string): boolean {
  const name = path.split("/").pop() ?? ""
  if (name === "route.ts" || name === "database.types.ts") return true
  if (isMarkdownDocPath(path)) return true
  return /(^|\/)migrations\/[^/]+\.sql$/.test(path)
}

export function selectFolderFiles(entries: FolderEntry[], isBlocked: (path: string) => boolean): FolderSelection {
  const selection: FolderSelection = { toRead: [], blockedPaths: [], skippedPaths: [] }
  for (const { path, size } of entries) {
    if (isBlocked(path)) {
      selection.blockedPaths.push(path)
      continue
    }
    if (!isExtractCandidate(path)) continue
    if (size > MAX_EXTRACT_FILE_BYTES) {
      selection.skippedPaths.push(path)
      continue
    }
    selection.toRead.push(path)
  }
  return selection
}

export async function readFolderFiles(
  entries: ReadableEntry[],
  isBlocked: (path: string) => boolean
): Promise<FolderReadResult> {
  const selection = selectFolderFiles(entries, isBlocked)
  const byPath = new Map(entries.map((entry) => [entry.path, entry]))
  const files: { path: string; text: string }[] = []
  const readFailedPaths: string[] = []
  for (const path of selection.toRead) {
    const entry = byPath.get(path)
    if (!entry) continue
    try {
      files.push({ path, text: await entry.text() })
    } catch {
      // 읽기 실패도 스킵으로 정직하게 남긴다 — 조용히 빠지면 "다 읽었다"는 거짓 안내가 된다.
      readFailedPaths.push(path)
    }
  }
  return {
    files,
    blockedPaths: selection.blockedPaths,
    skippedPaths: [...selection.skippedPaths, ...readFailedPaths],
    scannedCount: entries.length,
  }
}

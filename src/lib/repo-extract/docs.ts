import type { MarkdownDoc, RepoFileInput } from "./types"

// 기획 md 수집(ASM-070) — routes.ts/schema.ts와 동형(판정+추출 한 책임).
// 코드(라우트·스키마)와 별개로 "문서만" 읽어오는 게 안전 경계다. env·시크릿은
// blocklist가 이미 잡지만 여기서도 좁게 화이트리스트해 이중 방어한다.

// 개수·개별 바이트·총 바이트 캡 — 초과분은 조용히 누락하지 않고 capNotes로 정직 보고.
export const MAX_DOC_COUNT = 50
export const MAX_DOC_FILE_BYTES = 256 * 1024
export const MAX_DOC_TOTAL_BYTES = 512 * 1024

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"])

function basename(path: string): string {
  return (path.replace(/\\/g, "/").split("/").pop() ?? "").toLowerCase()
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

// 기획 문서 .md만 좁게. 시크릿 신호 이름(.env.md·secret·credential)은 배제한다.
export function isMarkdownDocPath(path: string): boolean {
  const name = basename(path)
  const dot = name.lastIndexOf(".")
  if (dot <= 0) return false // ".md"처럼 이름 없는 확장자 단독은 문서가 아니다
  if (!MARKDOWN_EXTENSIONS.has(name.slice(dot + 1))) return false
  if (name.startsWith(".env")) return false
  if (name.includes("secret") || name.includes("credential")) return false
  return true
}

export type MarkdownDocsResult = { docs: MarkdownDoc[]; capNotes: string[] }

// md 후보만 경로+내용으로 수집. 정렬 순회로 캡 컷이 결정적이게 한다(보고 안정).
export function extractMarkdownDocs(files: RepoFileInput[]): MarkdownDocsResult {
  const candidates = files
    .filter((f) => isMarkdownDocPath(f.path))
    .sort((a, b) => a.path.localeCompare(b.path))

  const docs: MarkdownDoc[] = []
  const capNotes: string[] = []
  let totalBytes = 0

  for (const file of candidates) {
    if (docs.length >= MAX_DOC_COUNT) {
      capNotes.push(`기획 문서 ${candidates.length}개를 찾았지만 캡(${MAX_DOC_COUNT}개)까지만 담았어요.`)
      break
    }
    const bytes = utf8ByteLength(file.text)
    if (bytes > MAX_DOC_FILE_BYTES) {
      capNotes.push(`문서 ${file.path}가 커서(캡 ${MAX_DOC_FILE_BYTES}B) 건너뛰었어요.`)
      continue
    }
    if (totalBytes + bytes > MAX_DOC_TOTAL_BYTES) {
      capNotes.push(`문서 총량이 캡(${MAX_DOC_TOTAL_BYTES}B)을 넘어 ${file.path}부터 건너뛰었어요.`)
      break
    }
    totalBytes += bytes
    docs.push({ path: file.path, content: file.text })
  }

  return { docs, capNotes }
}

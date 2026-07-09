import { describe, it, expect } from "vitest"
import {
  isMarkdownDocPath,
  extractMarkdownDocs,
  MAX_DOC_COUNT,
  MAX_DOC_FILE_BYTES,
  MAX_DOC_TOTAL_BYTES,
} from "./docs"

// 레포 기획 md 읽기(ASM-070) — 코드(라우트·스키마)와 별개로 기획 .md 문서만 좁게 화이트리스트.
// 안전 경계: env·시크릿·코드는 제외. 캡 초과는 조용히 누락하지 않고 capNotes로 정직 보고.

describe("isMarkdownDocPath", () => {
  it("기획 .md/.markdown 문서를 화이트리스트한다", () => {
    expect(isMarkdownDocPath("README.md")).toBe(true)
    expect(isMarkdownDocPath("docs/prd/overview.md")).toBe(true)
    expect(isMarkdownDocPath("docs/keyboard.markdown")).toBe(true)
  })

  it("코드·비-md는 후보가 아니다", () => {
    expect(isMarkdownDocPath("src/app/api/walks/route.ts")).toBe(false)
    expect(isMarkdownDocPath("package.json")).toBe(false)
    expect(isMarkdownDocPath("docs/diagram.png")).toBe(false)
    expect(isMarkdownDocPath(".md")).toBe(false)
  })

  it("시크릿이 박힐 수 있는 이름은 배제한다(이중 방어 — blocklist도 이미 잡음)", () => {
    expect(isMarkdownDocPath(".env.md")).toBe(false)
    expect(isMarkdownDocPath("ops/secrets.md")).toBe(false)
    expect(isMarkdownDocPath("credentials.md")).toBe(false)
  })

  it("route.md는 문서로만 잡는다 — 라우트 파서(routes.ts)는 route.ts/js만 봐서 오인 없음", () => {
    expect(isMarkdownDocPath("docs/app/route.md")).toBe(true)
  })
})

describe("extractMarkdownDocs", () => {
  it("md만 경로+내용으로 수집하고 코드는 건너뛴다", () => {
    const { docs, capNotes } = extractMarkdownDocs([
      { path: "README.md", text: "# 안내" },
      { path: "src/app/api/x/route.ts", text: "export function GET(){}" },
    ])
    expect(docs).toEqual([{ path: "README.md", content: "# 안내" }])
    expect(capNotes).toEqual([])
  })

  it("경로 정렬로 결정적으로 수집한다", () => {
    const { docs } = extractMarkdownDocs([
      { path: "b.md", text: "b" },
      { path: "a.md", text: "a" },
    ])
    expect(docs.map((d) => d.path)).toEqual(["a.md", "b.md"])
  })

  it("개수 캡을 넘으면 컷 + capNotes 사유", () => {
    const files = Array.from({ length: MAX_DOC_COUNT + 1 }, (_, i) => ({
      path: `d${String(i).padStart(3, "0")}.md`,
      text: "x",
    }))
    const { docs, capNotes } = extractMarkdownDocs(files)
    expect(docs).toHaveLength(MAX_DOC_COUNT)
    expect(capNotes.some((n) => n.includes(String(MAX_DOC_COUNT)))).toBe(true)
  })

  it("개별 파일 바이트 캡 초과는 건너뛰고 사유를 남긴다", () => {
    const big = "x".repeat(MAX_DOC_FILE_BYTES + 1)
    const { docs, capNotes } = extractMarkdownDocs([
      { path: "big.md", text: big },
      { path: "ok.md", text: "ok" },
    ])
    expect(docs.map((d) => d.path)).toEqual(["ok.md"])
    expect(capNotes.some((n) => n.includes("big.md"))).toBe(true)
  })

  it("총 바이트 캡을 넘으면 넘긴 지점부터 건너뛴다", () => {
    const oneDoc = "x".repeat(MAX_DOC_FILE_BYTES) // 파일 캡 이내지만 총 캡은 2개면 초과
    const { docs, capNotes } = extractMarkdownDocs([
      { path: "a.md", text: oneDoc },
      { path: "b.md", text: oneDoc },
      { path: "c.md", text: oneDoc },
    ])
    expect(docs.map((d) => d.path)).toEqual(["a.md", "b.md"])
    expect(capNotes.some((n) => n.includes("총"))).toBe(true)
    expect(MAX_DOC_TOTAL_BYTES).toBeLessThan(MAX_DOC_FILE_BYTES * 3)
  })
})

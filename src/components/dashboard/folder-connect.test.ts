import { describe, it, expect } from "vitest"
import {
  isExtractCandidate,
  selectFolderFiles,
  readFolderFiles,
  MAX_EXTRACT_FILE_BYTES,
  type ReadableEntry,
} from "./folder-connect"

// 폴더 연결(ASM-062, F1-C) — 브라우저에서 폴더를 읽기 전 선별하는 순수 로직.
// 핵심 보증: 차단 파일(env 등)은 후보 판정보다 먼저 걸러져 text()가 아예 호출되지 않는다.

const isBlocked = (path: string) => /(^|\/)\.env(\.|$)/.test(path)

function entry(path: string, size = 100): { path: string; size: number } {
  return { path, size }
}

describe("isExtractCandidate", () => {
  it("route.ts·database.types.ts·migrations/*.sql·기획 md가 후보다", () => {
    expect(isExtractCandidate("src/app/api/walks/route.ts")).toBe(true)
    expect(isExtractCandidate("src/lib/database.types.ts")).toBe(true)
    expect(isExtractCandidate("supabase/migrations/0001_init.sql")).toBe(true)
    // ASM-070 — 기획 md 문서도 후보(읽기+미리보기). isMarkdownDocPath와 일치.
    expect(isExtractCandidate("README.md")).toBe(true)
    expect(isExtractCandidate("docs/prd.md")).toBe(true)
    expect(isExtractCandidate("src/components/Button.tsx")).toBe(false)
    // migrations 폴더 밖 sql·이름만 비슷한 파일은 후보가 아니다.
    expect(isExtractCandidate("scripts/seed.sql")).toBe(false)
    expect(isExtractCandidate("src/app/api/walks/route.test.ts")).toBe(false)
  })
})

describe("selectFolderFiles", () => {
  it("차단 파일은 후보 판정 전에 걸러 blockedPaths로 모은다", () => {
    const r = selectFolderFiles(
      [entry(".env"), entry("apps/web/.env.local"), entry("src/app/api/walks/route.ts")],
      isBlocked
    )
    expect(r.blockedPaths).toEqual([".env", "apps/web/.env.local"])
    expect(r.toRead).toEqual(["src/app/api/walks/route.ts"])
  })

  it("후보가 아닌 파일은 조용히 제외한다 (차단도 스킵도 아님)", () => {
    const r = selectFolderFiles([entry("package.json"), entry("src/components/Button.tsx")], isBlocked)
    expect(r).toEqual({ toRead: [], blockedPaths: [], skippedPaths: [] })
  })

  it("512KB 초과 후보는 skippedPaths로 모은다", () => {
    const r = selectFolderFiles(
      [
        entry("src/app/api/big/route.ts", MAX_EXTRACT_FILE_BYTES + 1),
        entry("src/app/api/ok/route.ts", MAX_EXTRACT_FILE_BYTES),
      ],
      isBlocked
    )
    expect(r.skippedPaths).toEqual(["src/app/api/big/route.ts"])
    expect(r.toRead).toEqual(["src/app/api/ok/route.ts"])
  })
})

describe("readFolderFiles", () => {
  function readable(path: string, opts: { size?: number; text?: string; fail?: boolean } = {}): ReadableEntry {
    return {
      path,
      size: opts.size ?? 100,
      text: async () => {
        if (opts.fail) throw new Error("read failed")
        return opts.text ?? ""
      },
    }
  }

  it("선별된 파일만 읽어 {path, text}로 돌려주고 scannedCount는 전체 파일 수다", async () => {
    const r = await readFolderFiles(
      [
        readable("src/app/api/walks/route.ts", { text: "export async function GET() {}" }),
        readable("README.md", { text: "# readme" }), // ASM-070 — md도 후보라 읽힌다
        readable("src/components/Button.tsx", { text: "export const Button = () => null" }), // 비후보 — 제외
      ],
      isBlocked
    )
    expect(r.files).toEqual([
      { path: "src/app/api/walks/route.ts", text: "export async function GET() {}" },
      { path: "README.md", text: "# readme" },
    ])
    expect(r.scannedCount).toBe(3)
  })

  it("차단 파일은 text()를 아예 호출하지 않는다", async () => {
    let readCount = 0
    const blocked: ReadableEntry = {
      path: ".env",
      size: 10,
      text: async () => {
        readCount++
        return "SECRET=fake"
      },
    }
    const r = await readFolderFiles([blocked], isBlocked)
    expect(readCount).toBe(0)
    expect(r.blockedPaths).toEqual([".env"])
    expect(r.files).toEqual([])
  })

  it("읽기에 실패한 파일은 skippedPaths에 합쳐 정직하게 남긴다", async () => {
    const r = await readFolderFiles(
      [
        readable("src/app/api/a/route.ts", { fail: true }),
        readable("src/app/api/b/route.ts", { text: "ok" }),
        readable("supabase/migrations/big.sql", { size: MAX_EXTRACT_FILE_BYTES + 1 }),
      ],
      isBlocked
    )
    expect(r.files).toEqual([{ path: "src/app/api/b/route.ts", text: "ok" }])
    expect(r.skippedPaths).toEqual(["supabase/migrations/big.sql", "src/app/api/a/route.ts"])
  })
})

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { RepoFileInput } from "../types"

// 테스트 전용 로더(node 환경) — 앱 코드에서 import 금지.
// .env*·*.pem은 레포 전역 .gitignore에 걸려 실파일로 커밋할 수 없다 → 경로만 진짜로 두고
// 내용은 명백한 가짜 값을 인라인. 함수 입력은 {path, text}라 디스크 파일명과 무관하다.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "repo")

function fromDisk(path: string): RepoFileInput {
  return { path, text: readFileSync(join(ROOT, path), "utf8") }
}

export function loadFixtureRepo(): RepoFileInput[] {
  return [
    fromDisk("app/api/surveys/[id]/route.ts"),
    fromDisk("app/(admin)/api/admin/users/route.ts"),
    fromDisk("src/app/api/health/route.js"),
    fromDisk("src/app/api/notes/route.ts"),
    fromDisk("database.types.ts"),
    fromDisk("supabase/migrations/0001_init.sql"),
    fromDisk("package-lock.json"),
    fromDisk("assets/logo.png"),
    fromDisk("README.md"),
    { path: ".env.local", text: "FAKE_KEY=not-a-real-secret\n" },
    { path: "certs/server.pem", text: "FAKE-PEM-not-a-real-key\n" },
    { path: "config/secrets.ts", text: "export const FAKE = true\n" },
    { path: "node_modules/leftpad/index.js", text: "module.exports = () => {}\n" },
  ]
}

// 1순위(database.types.ts) 부재 시나리오 — 마이그레이션 SQL 파서 검증용.
export function loadMigrationsRepo(): RepoFileInput[] {
  return [fromDisk("supabase/migrations/0001_init.sql")]
}

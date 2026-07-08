import { describe, expect, it } from "vitest"
import { isBlockedPath } from "./blocklist"

describe("isBlockedPath — 차단해야 하는 경로", () => {
  it.each([
    ".env",
    ".env.local",
    "apps/web/.env.production",
    ".ENV.LOCAL",
    "certs/server.pem",
    "keys/deploy.key",
    "config/credentials.json",
    "config/secrets.ts",
    "AWS_SECRET.txt",
    "ops/Credential-Store/token.txt",
    ".git/config",
    "packages/a/node_modules/x/index.js",
    ".next/cache/chunk.js",
    "assets/logo.png",
    "img/photo.JPEG",
    "fonts/inter.woff2",
    "dist/bundle.zip",
    "bin/app.exe",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "apps/web/package-lock.json",
  ])("차단: %s", (path) => {
    expect(isBlockedPath(path)).toBe(true)
  })
})

describe("isBlockedPath — 크로스체크 보강 (흔한 크레덴셜 캐리어)", () => {
  it.each([
    // 이름 차단
    ".npmrc",
    "apps/web/.npmrc",
    ".yarnrc",
    ".netrc",
    "_netrc",
    ".pgpass",
    ".pypirc",
    ".boto",
    ".htpasswd",
    ".git-credentials",
    // 프리픽스 차단 (ssh 개인키 계열)
    "id_rsa",
    "keys/id_rsa.bak",
    "id_ed25519",
    "id_ecdsa.old",
    "ID_RSA",
    // 디렉토리 세그먼트
    ".ssh/config",
    "home/.aws/config",
    ".kube/config",
    ".docker/config.json",
    ".gnupg/pubring.kbx",
    // 확장자
    "cert.p12",
    "cert.pfx",
    "android/release.jks",
    "app.keystore",
    "AuthKey_ABC123.p8",
    "server.ppk",
    "backup.gpg",
    "privkey.asc",
    "config/dev.env",
    "data.sqlite3",
    "infra/prod.tfstate",
  ])("차단: %s", (path) => {
    expect(isBlockedPath(path)).toBe(true)
  })

  it.each(["package.json", "src/id_generator.ts", "docs/aws-guide.md", "src/envelope.ts"])(
    "여전히 허용: %s",
    (path) => {
      expect(isBlockedPath(path)).toBe(false)
    }
  )
})

describe("isBlockedPath — 허용해야 하는 경로", () => {
  it.each([
    "app/api/surveys/route.ts",
    "src/lib/env.ts",
    "src/environment.ts",
    "database.types.ts",
    "supabase/migrations/0001_init.sql",
    "README.md",
    "docs/keyboard.md",
    "package.json",
  ])("허용: %s", (path) => {
    expect(isBlockedPath(path)).toBe(false)
  })
})

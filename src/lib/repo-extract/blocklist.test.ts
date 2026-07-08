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

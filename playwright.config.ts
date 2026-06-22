import { defineConfig, devices } from "@playwright/test"

// Autopilot 기능 QA 하니스 (ASS-180). 전용 포트 3100(E2E_PORT override) — 수동 dev 서버와 분리.
// AI 호출 0 원칙: 스펙은 /preview 픽스처·시드 + page.route 모킹으로 검증(실 opus 호출 금지).
const PORT = Number(process.env.E2E_PORT ?? 3100)

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // 단일 dev 서버 공유 — 직렬 실행이 안정적
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // Next 16 Turbopack 첫 컴파일 여유
  },
})

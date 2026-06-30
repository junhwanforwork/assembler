import { chromium } from "playwright"

const SID = "ui-smoke-fixed-001"
const BASE = "http://localhost:3018"

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 940 } })
const page = await ctx.newPage()
await page.addInitScript((s) => localStorage.setItem("assembler_session_id", s), SID)

await page.goto(`${BASE}/`)
await page.waitForLoadState("networkidle")

// 1) 프로젝트 연결
await page.getByRole("button", { name: "프로젝트 연결" }).click()
await page.getByPlaceholder("예: 산책 메이트 앱").fill("산책 메이트 앱")
await page.getByRole("button", { name: "연결하기" }).click()
await page.getByRole("button", { name: "산책 메이트 앱", exact: true }).waitFor({ timeout: 10000 })

// 2) 빈 파일 생성
await page.getByText("빈 파일로 시작").click()
await page.waitForTimeout(1800)

await page.screenshot({ path: "design-prototypes/dashboard-live.png" })
console.log("OK screenshot saved")
await browser.close()

import { chromium } from "playwright"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const URL = pathToFileURL(resolve("design-prototypes/02-editor.html")).href
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(URL)
await page.waitForTimeout(400)
const shot = (name) => page.screenshot({ path: `design-prototypes/02-${name}.png` })
const art = (view) => page.locator(`.trow[data-view='${view}']`)

// 1) 문서(기본) — 단일 트리(아티팩트+DB/API), 상단=Main(스코프)
await shot("doc")

// 2) 기능명세서 — 디렉토리 + 벌크바
await art("spec").click()
await page.waitForTimeout(200)
await page.locator("#reqlist .mrow input").nth(1).check()
await page.locator("#reqlist .mrow input").nth(3).check()
await page.waitForTimeout(150)
await shot("spec-directory")

// 3) 기능명세서 — 트리 뷰
await page.locator(".rail-btn[data-specview='tree']").click()
await page.waitForTimeout(200)
await shot("spec-tree")

// 4) 와이어프레임 = 중앙 + 우(페이지 목록)
await art("wire").click()
await page.waitForTimeout(250)
await shot("wireframe")

// 4b) 우측 "페이지 정보"(디스크립션) 토글
await page.locator(".rsegbtn[data-rmode='desc']").click()
await page.waitForTimeout(200)
await shot("wireframe-desc")

// 5) 전역 DB/API → 트리 API → 중앙 데이터 뷰 + detail 드릴인
await page.locator(".trow[data-view='data'][data-seg='api']").click()
await page.waitForTimeout(250)
await page.locator("[data-dtabpane='api'] tbody tr[data-row]").first().click()
await page.waitForTimeout(200)
await shot("data-center")

// 6) 계획 오버레이 (AI 수정 → 적용 직전)
await page.keyboard.press("Escape")
await art("spec").click()
await page.waitForTimeout(150)
await page.locator(".rail-btn[data-specview='dir']").click()
await page.waitForTimeout(150)
await page.locator(".ai-edit").click()
await page.waitForTimeout(250)
await shot("plan-overlay")

// 7) 작업 스코프 전환 (드롭다운 → 결제화면 리뉴얼 → 스코프 칩)
await page.keyboard.press("Escape")
await art("doc").click()
await page.waitForTimeout(120)
await page.locator("#projbtn").click()
await page.waitForTimeout(150)
await page.locator(".pm-item[data-scope='결제화면 리뉴얼']").click()
await page.waitForTimeout(200)
await shot("scope")

// 8) 좌·우 접기 → 중앙 집중
await page.locator("#lc").click()
await page.locator("#rc").click()
await page.waitForTimeout(300)
await shot("collapsed")

console.log("OK — screenshots saved to design-prototypes/02-*.png")
await browser.close()

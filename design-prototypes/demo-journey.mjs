import { chromium } from "playwright"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const DASH = pathToFileURL(resolve("design-prototypes/01-product-main-dashboard.html")).href
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
let step = 0
const shot = async (name) => { step++; await page.screenshot({ path: `design-prototypes/demo-${String(step).padStart(2,"0")}-${name}.png` }) }

// ── KF1: 대시보드 진입 ──
await page.goto(DASH)
await page.waitForTimeout(400)
await shot("dashboard")

// ── KF2: 파일 카드 → 에디터 진입 (필수) ──
await page.locator(".rcard").first().click()
await page.waitForLoadState("load")
await page.waitForTimeout(400)
await shot("editor-enter")          // 문서(기본), 상단 Main 스코프

// ── KF3: 스코프 전환 ──
await page.locator("#projbtn").click()
await page.waitForTimeout(150)
await page.locator(".pm-item[data-scope='결제화면 리뉴얼']").click()
await page.waitForTimeout(200)
await shot("scope")                 // 스코프 칩
await page.locator("#scopex").click()
await page.waitForTimeout(120)

// ── KF4: 아티팩트 탐색 ──
// 기능명세서 — 디렉토리 + 벌크바
await page.locator(".trow[data-view='spec']").click()
await page.waitForTimeout(200)
await page.locator("#reqlist .mrow input").nth(1).check()
await page.locator("#reqlist .mrow input").nth(3).check()
await page.waitForTimeout(150)
await shot("spec-directory")
// 기능명세서 — 트리 뷰
await page.locator(".rail-btn[data-specview='tree']").click()
await page.waitForTimeout(200)
await shot("spec-tree")
// 기능명세서 — 도큐먼트 뷰
await page.locator(".rail-btn[data-specview='doc']").click()
await page.waitForTimeout(200)
await shot("spec-doc")
// 유저플로우
await page.locator(".trow[data-view='flow']").click()
await page.waitForTimeout(200)
await shot("flow")
// 와이어프레임 + 우 페이지 목록
await page.locator(".trow[data-view='wire']").click()
await page.waitForTimeout(250)
await shot("wireframe")
// 와이어 — 페이지 정보(디스크립션) + Dev 렌즈 refchip
await page.locator(".rsegbtn[data-rmode='desc']").click()
await page.waitForTimeout(200)
await shot("wireframe-desc")

// ── KF5: 컨텍스트 DB/API → 우측 플로팅 (이 요소가 쓰는 것만) ──
await page.locator(".refchip").first().click()
await page.waitForTimeout(250)
await shot("api-floating-context")
await page.keyboard.press("Escape")

// ── KF5b: 전역 DB/API → 트리 API → 중앙 데이터 뷰 + 행 드릴인 ──
await page.locator(".trow[data-view='data'][data-seg='api']").click()
await page.waitForTimeout(250)
await page.locator("[data-dtabpane='api'] tbody tr[data-row]").first().click()
await page.waitForTimeout(200)
await shot("data-center")
// 전역 DB → 관계도(ER, 테이블=노드·FK=엣지)
await page.locator(".trow[data-view='data'][data-seg='db']").click()
await page.waitForTimeout(250)
await shot("db-er")
// ER 노드 hover → 그 테이블 역할 설명 팝오버
await page.locator(".er-node[data-name='repairs']").hover()
await page.waitForTimeout(250)
await shot("db-er-tip")
// ER 노드 클릭 → 우측 인스펙터에 테이블 상세(역할·컬럼·쓰는 곳·관련 API)
await page.locator(".er-node[data-name='repairs']").click()
await page.waitForTimeout(250)
await shot("db-er-detail")

// ── KF6: AI 수정 요청 → 계획 오버레이 → 적용 ──
await page.locator(".trow[data-view='spec']").click()
await page.waitForTimeout(150)
await page.locator(".rail-btn[data-specview='dir']").click()
await page.waitForTimeout(150)
await page.locator(".ai-edit").click()
await page.waitForTimeout(250)
await shot("plan-dock")                                  // 우측 도크 + 영향 DB/API
await page.locator(".pd-foot .btn-filled").click()       // 적용하기
await page.waitForTimeout(150)

// ── KF7: 좌·우 패널 접기 ──
await page.locator(".trow[data-view='doc']").click()
await page.waitForTimeout(120)
await page.locator("#lc").click()
await page.locator("#rc").click()
await page.waitForTimeout(300)
await shot("collapsed")
await page.locator("#lc").click()
await page.locator("#rc").click()
await page.waitForTimeout(200)

// ── 친절 추천 (AI 챗) ──
await page.locator(".seg[data-left='chat']").click()
await page.waitForTimeout(200)
await shot("chat-recommend")

// ── 복귀: 로고 → 대시보드 ──
await page.locator(".seg[data-left='tree']").click()
await page.waitForTimeout(120)
await page.locator(".spark").click()
await page.waitForLoadState("load")
await page.waitForTimeout(300)
await shot("back-to-dashboard")

console.log(`OK — ${step} demo screenshots saved to design-prototypes/demo-*.png`)
await browser.close()

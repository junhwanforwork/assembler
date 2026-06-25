import { test, expect, type Page } from "@playwright/test"

// perf 증거 생성기 — /perf 하네스(?perf=1)에서 핵심 인터랙션을 구동하고, 인앱 perf 마크를 수집해
// RAIL 예산 대비 PASS/FAIL을 stdout에 찍는다 → 트랜스크립트 → /goal 평가자가 판정.
//
// 주의(헤드리스 노이즈): 헤드리스 Chromium의 RAF 프레임 타이밍은 실기기보다 불안정하다.
// 게이트 임계값은 "헤드리스 보정값"이고, RAIL 절대 예산(프레임 16.7ms 등)은 프로덕션 목표로
// React DevTools Profiler로 수동 측정한다(perf-diagnosis.md). 회귀 추적이 1차 신호.
//
// 커버리지: flow-drag · inspector-commit · wireframe-load.
// ⏸ canvas-pan(InfiniteCanvas)은 미배포 → deferred(ASS-033/034 배포 시 surface 추가).

interface ProbeResult {
  label: string
  frames: number
  p95FrameMs: number
  longFrames: number
  worstMs: number
}

// 헤드리스 보정 예산. prod 목표(괄호)와 별개 — 회귀 가드 + 헤드리스 상한.
const BUDGET = {
  flowDragP95Ms: 40, // prod 목표 16.7(60fps).
  inspectorCommitMs: 120, // prod 목표 50.
  wireframeLoadMs: 2000, // TTI < 2s.
}

async function readProbes(page: Page): Promise<ProbeResult[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __perfResults__?: ProbeResult[] }
    return w.__perfResults__ ?? []
  })
}

async function readMeasure(page: Page, name: string): Promise<number | null> {
  return page.evaluate((n) => {
    const e = performance.getEntriesByName(n, "measure")
    return e.length ? e[e.length - 1].duration : null
  }, name)
}

test.describe("perf", () => {
  test("flow-drag 프레임이 예산 안", async ({ page }) => {
    await page.goto("/perf?perf=1&surface=flow")
    const node = page.getByRole("button", { name: "로그인 화면 편집하기" })
    await expect(node).toBeVisible()

    // 드래그를 월클럭으로 펼쳐 실제 프레임이 쌓이게 한다(steps만으론 한 프레임에 뭉침).
    const box = (await node.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 6, box.y + box.height / 2 + i * 3)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()

    const drag = (await readProbes(page)).find((p) => p.label === "flow-drag")
    expect(drag, "flow-drag 프로브가 publish돼야 함").toBeTruthy()
    console.log(`[perf] flow-drag       frames=${drag!.frames} p95=${drag!.p95FrameMs}ms long=${drag!.longFrames} worst=${drag!.worstMs}ms → ${verdict(drag!.p95FrameMs, BUDGET.flowDragP95Ms)} (≤${BUDGET.flowDragP95Ms}ms)`)
    expect(drag!.frames).toBeGreaterThan(3)
    expect(drag!.p95FrameMs).toBeLessThanOrEqual(BUDGET.flowDragP95Ms)
  })

  test("inspector-commit 지연이 예산 안", async ({ page }) => {
    await page.goto("/perf?perf=1")
    // 유니크 요소명으로 선택 → 인스펙터 오픈(selectedElementId).
    await page.getByRole("button", { name: "Email Input" }).first().click()
    const name = page.locator('aside[aria-label="요소 매핑 편집"] input[placeholder="요소 이름"]')
    await expect(name).toBeVisible()
    await name.fill("이메일 입력 필드")
    await page.waitForTimeout(300) // 커밋 디바운스(200ms) + rAF measure

    const dur = await readMeasure(page, "inspector-commit")
    expect(dur, "inspector-commit measure가 있어야 함").not.toBeNull()
    console.log(`[perf] inspector-commit ${dur!.toFixed(1)}ms → ${verdict(dur!, BUDGET.inspectorCommitMs)} (≤${BUDGET.inspectorCommitMs}ms)`)
    expect(dur!).toBeLessThanOrEqual(BUDGET.inspectorCommitMs)
  })

  test("wireframe-load TTI가 예산 안", async ({ page }) => {
    // 라우트 워밍(Turbopack 첫 컴파일 분리) 후 콜드 네비 측정.
    await page.goto("/perf?perf=1")
    await expect(page.getByText("탐색기")).toBeVisible()

    const t0 = Date.now()
    await page.goto("/perf?perf=1")
    await expect(page.getByText("탐색기")).toBeVisible()
    const tti = Date.now() - t0
    console.log(`[perf] wireframe-load   ${tti}ms → ${verdict(tti, BUDGET.wireframeLoadMs)} (≤${BUDGET.wireframeLoadMs}ms)`)
    expect(tti).toBeLessThanOrEqual(BUDGET.wireframeLoadMs)
  })
})

function verdict(value: number, budget: number): string {
  return value <= budget ? "PASS" : "FAIL"
}

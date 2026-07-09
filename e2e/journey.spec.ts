import { existsSync, readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { seedSession } from "./helpers"
import { cleanupSeed, resolveSeedSessionId, SEED_PRODUCT_NAME, seedE2E, type SeedResult } from "../scripts/seed-e2e"

// 실 DB 여정 (ASM-037) — 기존 스펙(전면 모킹, 계약 검증)과 반대로 저장·전파 적용·내보내기·싱크-인을
// 실 dev 서버 + 실 DB로 관통한다. AI 유료 호출만 0(generate·files 차단, chat은 픽스처 계획).
const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = `http://localhost:${PORT}`

// 로컬 dev+실 DB 전제 — Supabase env(.env.local)가 없는 CI/무DB 환경에서는 통째로 skip.
const HAS_REAL_DB = existsSync(".env.local")

type SeedDesign = {
  requirements: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    role: string
    acceptanceCriteria: string[]
  }[]
}
const seedDesign = (): SeedDesign =>
  JSON.parse(readFileSync("docs/specs/diagnosis/m1-seed-design.json", "utf8")) as SeedDesign

// 픽스처 변경 계획 — 시드 그래프의 실제 요구사항(req0)을 다듬고(update → 영향 범위 전파) 1건 추가한다.
function journeyPlanBlocks() {
  const r0 = seedDesign().requirements[0]
  return [
    { kind: "text", text: "여정 검증용 변경 계획이에요." },
    {
      kind: "plan",
      plan: {
        title: "여정 검증 계획",
        summary: "요구사항 1건을 다듬고 1건을 추가해요.",
        ops: [
          {
            id: "op-0",
            collection: "requirements",
            action: "update",
            targetId: r0.id,
            summary: "그래프 생성 요구사항을 다듬어요",
            payload: { ...r0, description: `${r0.description} (여정 e2e로 다듬음)` },
          },
          {
            id: "op-1",
            collection: "requirements",
            action: "add",
            targetId: "req-e2e-journey",
            summary: "여정 검증 요구사항을 추가해요",
            payload: {
              id: "req-e2e-journey",
              title: "여정 e2e 검증",
              description: "실 DB 여정 e2e가 추가한 요구사항이에요.",
              status: "draft",
              priority: "low",
              role: "qa",
              acceptanceCriteria: [],
            },
          },
        ],
      },
    },
  ]
}

// AI 경로 전부(유료 5종) 차단/픽스처 — 저장·PATCH·싱크-인 등 나머지 API는 전부 실 관통.
// suggestions는 명시 트리거(도크 토글·재시도)만 발화한다(ASM-048) — 차단은 방어 심층화로 유지.
async function blockAiRoutes(page: Page): Promise<void> {
  await page.route("**/api/generate", (route) => route.abort())
  await page.route("**/api/products/*/files", (route) => route.abort())
  await page.route("**/api/workspaces/*/suggestions", (route) => route.abort())
  await page.route("**/api/workspaces/*/db-tables/*/note", (route) => route.abort())
  await page.route("**/api/workspaces/*/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ blocks: journeyPlanBlocks() }),
    })
  )
}

// 시드가 beforeAll 1회라 비멱등 — 재시도는 변형된 상태 위 재실행이라 항상 이중 실패(플레이크 흡수 불가).
test.describe.configure({ retries: 0 })

test.describe("실 DB 여정 (ASM-037)", () => {
  test.skip(!HAS_REAL_DB, "실 DB env(.env.local) 부재 — 여정 스펙은 로컬 dev + 실 DB 전제")

  const sessionId = resolveSeedSessionId()
  let seeded: SeedResult

  test.beforeAll(async () => {
    seeded = await seedE2E({ baseUrl: BASE_URL })
  })

  test.afterAll(async () => {
    // 실 DB 쓰레기 잔류 금지 — 여정이 만든 제품(카스케이드로 스펙·API·테이블 포함)을 지운다.
    await cleanupSeed({ baseUrl: BASE_URL })
  })

  test("에디터 여정 — 시드 도달 → 저장(실 PATCH) → 전파·적용 → 내보내기", async ({ page }) => {
    await seedSession(page, sessionId)
    await blockAiRoutes(page)
    await page.goto(`/editor/${seeded.workspaceId}`)
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 시드 도달 — 그래프(요구 6)와 코드-진실(API 25)이 실 DB에서 로드된다.
    await expect(page.getByRole("button", { name: /^문서/ }).getByText("6")).toBeVisible()
    await expect(page.getByRole("button", { name: /^API/ }).getByText("25")).toBeVisible()

    // ① 저장 — 수용 기준 인라인 추가 → 실 PATCH 200 → reload 후에도 남는다(실 DB 왕복 증명).
    const AC_TEXT = "여정 e2e가 실 DB 저장을 검증한다"
    await page.getByRole("button", { name: /아이디어를 연결된 스펙 그래프로 생성/ }).first().click()
    await page.getByRole("button", { name: "수용 기준 추가" }).click()
    const acInput = page.getByLabel("새 수용 기준")
    const patchSave = page.waitForResponse(
      (r) => r.url().includes(`/api/workspaces/${seeded.workspaceId}/design`) && r.request().method() === "PATCH"
    )
    await acInput.fill(AC_TEXT)
    await acInput.press("Enter")
    expect((await patchSave).status()).toBe(200)

    await page.reload()
    await page.getByRole("button", { name: /아이디어를 연결된 스펙 그래프로 생성/ }).first().click()
    await expect(page.locator("aside").getByText(AC_TEXT)).toBeVisible()

    // ② 전파 — 픽스처 계획(update op)이 역참조 전파(impact)를 띄우고, 적용하기가 실 PATCH로 저장된다.
    const chatInput = page.getByLabel("AI 챗 입력")
    await chatInput.fill("여정 계획 적용해줘")
    await chatInput.press("Enter")
    await expect(page.getByText("여정 검증 계획", { exact: true })).toBeVisible()
    await expect(page.getByText("적용하면 연결된 이 객체들까지 영향이 닿아요.")).toBeVisible()
    await expect(page.locator('button[title="그래프 생성"]')).toBeVisible() // req0 → 연결 기능 칩(#39 점프형)

    const patchApply = page.waitForResponse(
      (r) => r.url().includes(`/api/workspaces/${seeded.workspaceId}/design`) && r.request().method() === "PATCH"
    )
    await page.getByRole("button", { name: "적용하기" }).click()
    expect((await patchApply).status()).toBe(200)
    await expect(page.getByText("변경 계획을 스펙에 반영했어요.")).toBeVisible()
    await expect(page.getByRole("button", { name: /^문서/ }).getByText("7")).toBeVisible()

    // ③ 내보내기 — 실 코드-진실(리매핑된 API id)이 패키징 미리보기에 실린다.
    await page.getByRole("banner").getByRole("button", { name: "내보내기" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("그래프 생성").check()
    const preview = dialog.locator("pre")
    await expect(preview).toContainText("그래프 생성")
    await expect(preview).toContainText("POST /api/generate")
    await expect(preview).toContainText("POST /api/workspaces")
    await page.keyboard.press("Escape")
  })

  test("대시보드 싱크-인 — 수동 코드 연결이 실 DB에 upsert된다", async ({ page }) => {
    await seedSession(page, sessionId)
    await blockAiRoutes(page)
    await page.goto("/")
    // 여정 세션의 제품은 시드 1개뿐 — 자동 선택된다(aria-pressed).
    await expect(page.getByRole("button", { name: SEED_PRODUCT_NAME })).toHaveAttribute("aria-pressed", "true")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    // ASM-062: JSON 직접 입력은 "고급" 접기 안으로 이동 — 펼쳐야 textarea가 보인다.
    await dialog.getByText("JSON 직접 넣기 — 개발자용").click()
    await dialog.getByLabel("코드 정보 JSON").fill(
      JSON.stringify({
        apis: [
          {
            method: "GET",
            endpoint: "/api/e2e-journey/ping",
            summary: "여정 e2e가 추가한 API",
            status: "planned",
            source: "code",
          },
        ],
      })
    )
    const syncPost = page.waitForResponse(
      (r) => r.url().includes(`/api/products/${seeded.productId}/apis`) && r.request().method() === "POST"
    )
    await dialog.getByRole("button", { name: "연결하기" }).click()
    expect((await syncPost).status()).toBe(200)
    // 메인 스펙은 시드가 이미 만들었다 — ifNone skip 분기 토스트.
    await expect(page.getByText(/코드를 연결했어요/)).toBeVisible()

    // 실 DB 반영 검증 — 에디터 트리 API 뱃지 25→26.
    await page.goto(`/editor/${seeded.workspaceId}`)
    await expect(page.getByRole("button", { name: /^API/ }).getByText("26")).toBeVisible()
  })
})

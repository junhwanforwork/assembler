import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 수동 싱크-인 경로 B 최소 버전 (ASM-026) — "이미 코드가 있어요" → JSON 붙여넣기 →
// 코드-진실 연결 → 스펙 0개면 "메인" 자동 생성 → Composer 카피가 코드 기반으로 전환.
// AI 호출 0 원칙: 모든 API는 page.route 모킹, 와이어 레벨로 계약(body)을 검증한다.

const PRODUCT = { id: "p1", name: "산책 메이트", description: "" }
const MAIN_WS = { id: "w-main", productId: "p1", name: "메인", isMain: false, counts: { requirements: 0, features: 0, pages: 0, flows: 0, wireframes: 0, elements: 0 } }

const API_ROW = { method: "GET", endpoint: "/walks", summary: "산책 목록", status: "active", source: "code" }
const TABLE_ROW = {
  name: "walks",
  description: "산책 기록",
  columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
  source: "code",
}

type Captured = { apisBody?: unknown; tablesBody?: unknown; workspaceBody?: unknown }

// 싱크 전 GET은 빈 목록, POST 후 GET은 채워진 목록 — useCodeTruth 재판정(reload)까지 상태ful로 재현.
// tablesFailOnce: 테이블 POST 1회차만 500 — 부분 실패(API 성공·테이블 실패) 재현용.
async function mockSyncApis(page: Page, opts: { tablesFailOnce?: boolean } = {}): Promise<Captured> {
  const captured: Captured = {}
  let apisSynced = false
  let tablesSynced = false
  let shouldFailTables = opts.tablesFailOnce ?? false
  const workspaces: (typeof MAIN_WS)[] = []

  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [PRODUCT] }) })
  )
  await page.route("**/api/workspaces*", (route) => {
    if (route.request().method() === "POST") {
      captured.workspaceBody = route.request().postDataJSON()
      workspaces.push(MAIN_WS)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(MAIN_WS) })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ workspaces }) })
  })
  await page.route("**/api/products/p1/apis", (route) => {
    if (route.request().method() === "POST") {
      captured.apisBody = route.request().postDataJSON()
      apisSynced = true
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ apis: [{ id: "a1", productId: "p1", ...API_ROW }] }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ apis: apisSynced ? [{ id: "a1", productId: "p1", ...API_ROW }] : [] }),
    })
  })
  await page.route("**/api/products/p1/db-tables", (route) => {
    if (route.request().method() === "POST") {
      captured.tablesBody = route.request().postDataJSON()
      if (shouldFailTables) {
        shouldFailTables = false
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "server_error" }) })
      }
      tablesSynced = true
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ dbTables: [{ id: "t1", productId: "p1", ...TABLE_ROW }] }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dbTables: tablesSynced ? [{ id: "t1", productId: "p1", ...TABLE_ROW }] : [] }),
    })
  })
  return captured
}

test.describe("수동 싱크-인 (ASM-026)", () => {
  test("붙여넣기 → 연결 → 메인 스펙 자동 생성 + 코드 기반 카피 전환", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    // 코드-진실이 없는 동안은 일반 카피 — 과약속 금지(C-4).
    await expect(page.getByText("적어 준 아이디어를 선택한 프로젝트의 연결된 구조로 펼쳐 드려요.")).toBeVisible()

    // 진입 → 모달 → 붙여넣기 → 연결하기.
    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 스펙 0개였으므로 "메인" 자동 생성(T7) — 토스트 + 목록 반영.
    await expect(page.getByText("코드를 연결하고 메인 스펙을 만들었어요")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText("메인", { exact: true })).toBeVisible()

    // 카피 재판정 — 이제 "코드를 바탕으로"를 약속해도 거짓이 아니다.
    await expect(
      page.getByText("선택한 프로젝트의 코드(API·DB)를 바탕으로 아이디어를 연결된 구조로 펼쳐 드려요.")
    ).toBeVisible()

    // 와이어 검증 — 서버 파서 계약 그대로(기본값 채움 포함) 전송됐다.
    expect(captured.apisBody).toEqual({ apis: [API_ROW] })
    expect(captured.tablesBody).toEqual({ tables: [TABLE_ROW] })
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인" })
  })

  test("잘못된 행은 몇 번째가 왜 거부됐는지 보여주고 전송하지 않는다", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await dialog
      .getByLabel("코드 정보 JSON")
      .fill(JSON.stringify({ apis: [API_ROW, { ...API_ROW, method: "FETCH" }], tables: [{ ...TABLE_ROW, name: "" }] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 행 단위 사용자 언어 피드백 — 기술 코드 노출 없이.
    await expect(dialog.getByText("아래 항목을 고치고 다시 시도해 주세요.")).toBeVisible()
    await expect(dialog.getByText("API 2번 항목: method는 GET·POST·PUT·PATCH·DELETE 중 하나로 적어 주세요.")).toBeVisible()
    await expect(dialog.getByText("테이블 1번 항목: 테이블 name을 적어 주세요.")).toBeVisible()

    // 검증 실패 시 서버로 아무것도 보내지 않는다.
    expect(captured.apisBody).toBeUndefined()
    expect(captured.tablesBody).toBeUndefined()

    // 고치면 이어서 성공할 수 있다 — 모달은 닫히지 않고 입력이 보존된다.
    await expect(dialog.getByLabel("코드 정보 JSON")).toHaveValue(/FETCH/)
  })

  test("부분 실패(API 성공·테이블 실패) → 사실 그대로 안내 → 재시도로 완결", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page, { tablesFailOnce: true })
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 이미 연결된 사실(API)을 숨기지 않는다 — 폴백 "일시적인 오류" 대신 부분 성공 안내.
    await expect(dialog.getByText("API는 연결했어요. 테이블 연결에서 오류가 났어요 — 다시 시도해 주세요.")).toBeVisible()

    // 재시도(업서트 멱등) → 완결. 스펙 0개였으므로 메인 자동 생성 토스트까지.
    await dialog.getByRole("button", { name: "연결하기" }).click()
    await expect(page.getByText("코드를 연결하고 메인 스펙을 만들었어요")).toBeVisible()
    await expect(dialog).toHaveCount(0)
  })
})

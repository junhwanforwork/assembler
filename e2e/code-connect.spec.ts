import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 코드 연결 (ASM-026 → ASM-062 → ASM-066 시작 3경로 조립) — "코드 연결하기" 3경로:
// ① 내 폴더 선택 ② 깃 주소(repo-scan) ③ JSON 직접 넣기(고급 접기, 기존 경로).
// ASM-066: 진입은 프로젝트 선택과 무관하게 상시 노출, 프로젝트가 없으면 이름 입력을 거쳐
// 진입 시점에 제품을 만들고, 연결로 "메인" 스펙이 새로 생기면 에디터로 직행한다(A경로 일관).
// AI 호출 0 원칙: 모든 API는 page.route 모킹, 와이어 레벨로 계약(body)을 검증한다.

const PRODUCT = { id: "p1", name: "산책 메이트", description: "" }
const PRODUCT2 = { id: "p2", name: "다른 프로젝트", description: "" }
const MAIN_WS = { id: "w-main", productId: "p1", name: "메인", isMain: false, counts: { requirements: 0, features: 0, pages: 0, flows: 0, wireframes: 0, elements: 0 } }

const API_ROW = { method: "GET", endpoint: "/walks", summary: "산책 목록", status: "active", source: "code" }
const TABLE_ROW = {
  name: "walks",
  description: "산책 기록",
  columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
  source: "code",
}

type Captured = { apisBody?: unknown; tablesBody?: unknown; workspaceBody?: unknown; productName?: unknown }

// 싱크 전 GET은 빈 목록, POST 후 GET은 채워진 목록 — useCodeTruth 재판정(reload)까지 상태ful로 재현.
// tablesFailOnce: 테이블 POST 1회차만 500 — 부분 실패(API 성공·테이블 실패) 재현용.
// startWithoutProduct: 프로젝트 0에서 시작 — POST /api/products 로 생성되는 신규 사용자 재현용.
// existingWorkspaces: 이미 스펙이 있는 프로젝트 — 서버 ifNone 판정(route.ts)과 같은 의미로
// POST /api/workspaces 가 { skipped: true } 를 돌려주는 분기 재현용.
// extraProducts: 프로젝트 여럿 재현 — 2개+면 자동 선택이 안 돼 '전체' 탭(미선택)으로 시작한다.
async function mockSyncApis(
  page: Page,
  opts: {
    tablesFailOnce?: boolean
    startWithoutProduct?: boolean
    existingWorkspaces?: (typeof MAIN_WS)[]
    extraProducts?: (typeof PRODUCT)[]
  } = {}
): Promise<Captured> {
  const captured: Captured = {}
  let apisSynced = false
  let tablesSynced = false
  let shouldFailTables = opts.tablesFailOnce ?? false
  const products: (typeof PRODUCT)[] = opts.startWithoutProduct ? [] : [PRODUCT, ...(opts.extraProducts ?? [])]
  const workspaces: (typeof MAIN_WS)[] = [...(opts.existingWorkspaces ?? [])]

  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/products", (route) => {
    if (route.request().method() === "POST") {
      captured.productName = (route.request().postDataJSON() as { name?: unknown }).name
      products.push(PRODUCT)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(PRODUCT) })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products }) })
  })
  await page.route("**/api/workspaces*", (route) => {
    if (route.request().method() === "POST") {
      captured.workspaceBody = route.request().postDataJSON()
      // 서버 ifNone 의미 그대로(src/app/api/workspaces/route.ts:41-43) — 있으면 skipped, 없으면 생성.
      const ifNone = (route.request().postDataJSON() as { ifNone?: unknown }).ifNone === true
      if (ifNone && workspaces.length > 0) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ skipped: true }) })
      }
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

// 레인 2 계약(POST /api/repo-scan)의 성공 응답 모킹 — 요청 body(gitUrl)를 캡처해 와이어 검증.
type ExtractResultLike = {
  payload: { apis: unknown[]; tables: unknown[] }
  report: {
    scannedCount: number
    blockedPaths: string[]
    skippedPaths: string[]
    docs?: { path: string; content: string }[]
  }
}

async function mockRepoScan(page: Page, result: ExtractResultLike): Promise<{ body?: unknown }> {
  const captured: { body?: unknown } = {}
  await page.route("**/api/repo-scan", (route) => {
    captured.body = route.request().postDataJSON()
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result }) })
  })
  return captured
}

// JSON 직접 넣기는 "고급" 접기로 강등됐다 — 기존 케이스는 이 펼침 한 단계만 추가된다.
async function openAdvancedJson(dialog: ReturnType<Page["getByRole"]>) {
  await dialog.getByText("JSON 직접 넣기 — 개발자용").click()
}

test.describe("수동 싱크-인 (ASM-026 → ASM-066)", () => {
  test("붙여넣기 → 연결 → 메인 스펙 자동 생성 → 에디터 직행(A경로 일관)", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    // 코드-진실이 없는 동안은 일반 카피 — 과약속 금지(C-4).
    await expect(page.getByText("적어 준 아이디어를 선택한 프로젝트의 연결된 구조로 펼쳐 드려요.")).toBeVisible()

    // 진입(상시 노출·행동형 라벨) → 모달 → 고급(JSON) 펼치기 → 붙여넣기 → 연결하기.
    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 스펙 0개였으므로 "메인" 자동 생성(T7) → 아이디어 경로와 같은 종착지: 에디터 직행.
    await expect(page).toHaveURL(/\/editor\/w-main/)

    // 와이어 검증 — 서버 파서 계약 그대로(기본값 채움 포함) 전송됐다.
    expect(captured.apisBody).toEqual({ apis: [API_ROW] })
    expect(captured.tablesBody).toEqual({ tables: [TABLE_ROW] })
    // ifNone(ASM-027) — 존재 판정은 서버가 한 요청 안에서. 클라 GET→POST check-then-act 제거.
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인", ifNone: true })
  })

  test("잘못된 행은 몇 번째가 왜 거부됐는지 보여주고 전송하지 않는다", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
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

  test("부분 실패(API 성공·테이블 실패) → 사실 그대로 안내 → 재시도로 완결 → 에디터 직행", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page, { tablesFailOnce: true })
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 이미 연결된 사실(API)을 숨기지 않는다 — 폴백 "일시적인 오류" 대신 부분 성공 안내.
    await expect(dialog.getByText("API는 연결했어요. 테이블 연결에서 오류가 났어요 — 다시 시도해 주세요.")).toBeVisible()

    // 재시도(업서트 멱등) → 완결. 스펙 0개였으므로 메인 자동 생성 → 에디터 직행.
    await dialog.getByRole("button", { name: "연결하기" }).click()
    await expect(page).toHaveURL(/\/editor\/w-main/)
  })

  test("기존 스펙 있음(ifNone skip) → 대시보드 잔류 + 토스트 + 코드 기반 카피 전환", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page, { existingWorkspaces: [MAIN_WS] })
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()

    // 새로 만든 스펙이 없으므로 직행하지 않는다 — 현행 유지(잔류 + 사실 그대로 토스트).
    await expect(page.getByText("코드를 연결했어요 (API 1 · 테이블 1)")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL("/")
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인", ifNone: true })

    // 카피 재판정(C-4) — 이제 "코드를 바탕으로"를 약속해도 거짓이 아니다.
    await expect(
      page.getByText("선택한 프로젝트의 코드(API·DB)를 바탕으로 아이디어를 연결된 구조로 펼쳐 드려요.")
    ).toBeVisible()
  })
})

test.describe("코드 연결 3경로 (ASM-062 → ASM-066)", () => {
  test("깃 주소 → 레포 스캔 → 미리보기(개수+차단 안내) → 연결 와이어 검증 → 에디터 직행", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    const scan = await mockRepoScan(page, {
      payload: { apis: [API_ROW], tables: [TABLE_ROW] },
      report: { scannedCount: 4, blockedPaths: [".env"], skippedPaths: [] },
    })
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("깃 주소").fill("https://github.com/acme/walks")
    await dialog.getByRole("button", { name: "가져오기" }).click()

    // 미리보기 — 찾은 개수 + 차단 정직 안내(파일명은 접힘). 요청 body는 {gitUrl} 계약 그대로.
    await expect(dialog.getByText("API 1개 · 테이블 1개를 찾았어요.")).toBeVisible()
    await expect(dialog.getByText("1개 파일은 안전을 위해 읽지 않았어요")).toBeVisible()
    expect(scan.body).toEqual({ gitUrl: "https://github.com/acme/walks" })

    // 연결하기 → 기존 submit 경로 그대로(서버 계약 body) → 메인 자동 생성 → 에디터 직행.
    await dialog.getByRole("button", { name: "연결하기" }).click()
    await expect(page).toHaveURL(/\/editor\/w-main/)
    expect(captured.apisBody).toEqual({ apis: [API_ROW] })
    expect(captured.tablesBody).toEqual({ tables: [TABLE_ROW] })
  })

  test("깃 주소 → 기획 md 문서도 읽어와 미리보기에 개수·경로를 보여준다 (ASM-070)", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page)
    await mockRepoScan(page, {
      payload: { apis: [API_ROW], tables: [] },
      report: {
        scannedCount: 3,
        blockedPaths: [],
        skippedPaths: [],
        docs: [
          { path: "README.md", content: "# 산책 메이트" },
          { path: "docs/prd.md", content: "## 기획" },
        ],
      },
    })
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("깃 주소").fill("https://github.com/acme/walks")
    await dialog.getByRole("button", { name: "가져오기" }).click()

    // 코드 개수 옆에 기획 문서 개수 + 경로 목록(접힘)까지 정직하게 보인다.
    await expect(dialog.getByText("API 1개 · 테이블 0개를 찾았어요.")).toBeVisible()
    await expect(dialog.getByText("기획 문서 2개를 함께 읽었어요.")).toBeVisible()
    await dialog.getByText("문서 경로 보기").click()
    await expect(dialog.getByText("docs/prd.md")).toBeVisible()
  })

  test("폴더 선택 → 차단 파일은 읽지 않고 → 0개 정직 안내(빈 연결 금지)", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page)
    await page.goto("/")

    await page.getByRole("button", { name: "코드 연결하기" }).click()
    const dialog = page.getByRole("dialog")

    // 추출 후보가 없는 폴더(.env + README) — 통합 후 실물 추출기가 와도 결과는 0개로 안정적이다.
    const dir = mkdtempSync(path.join(tmpdir(), "asm-connect-"))
    writeFileSync(path.join(dir, ".env"), "PLACEHOLDER=not-a-real-secret\n")
    writeFileSync(path.join(dir, "README.md"), "# sample\n")
    await dialog.getByLabel("프로젝트 폴더").setInputFiles(dir)

    // 정직 안내 — 못 찾았으면 못 찾았다고, 안 읽었으면 안 읽었다고.
    await expect(dialog.getByText("이 폴더에서 API·테이블을 찾지 못했어요")).toBeVisible()
    await expect(dialog.getByText("1개 파일은 안전을 위해 읽지 않았어요")).toBeVisible()

    // 빈 연결 금지 — 연결하기 자체가 없다.
    await expect(dialog.getByRole("button", { name: "연결하기" })).toHaveCount(0)
  })
})

test.describe("시작 3경로 조립 (ASM-066)", () => {
  test("신규 사용자(프로젝트 0) — 진입 상시 노출 → 이름 입력 → 진입 시점 제품 생성 → 연결 → 에디터 직행", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page, { startWithoutProduct: true })
    await page.goto("/")

    // 프로젝트가 없어도 연결 진입은 잠기지 않는다 — 시작 경로 1급(IA 4-1).
    const entry = page.getByRole("button", { name: "코드 연결하기" })
    await expect(entry).toBeVisible()
    await entry.click()

    // 프로젝트가 없으므로 이름 입력 단계를 먼저 거친다(연결용 부제 — 아이디어 미리보기 없음).
    const nameDialog = page.getByRole("dialog")
    await expect(nameDialog.getByText("프로젝트 만들기")).toBeVisible()
    await expect(nameDialog.getByText("프로젝트 이름을 정하면 코드를 연결해 드려요.")).toBeVisible()
    await nameDialog.getByPlaceholder("예: 산책 메이트 앱").fill(PRODUCT.name)
    await nameDialog.getByRole("button", { name: "만들기" }).click()

    // 진입 시점 제품 생성(와이어) → 그 id로 연결 모달이 이어진다.
    const connectDialog = page.getByRole("dialog")
    await expect(connectDialog.getByText("이미 코드가 있어요")).toBeVisible()
    expect(captured.productName).toBe(PRODUCT.name)

    await openAdvancedJson(connectDialog)
    await connectDialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await connectDialog.getByRole("button", { name: "연결하기" }).click()

    // 새 제품의 스펙 0개 → "메인" 자동 생성 → 에디터 직행(A경로와 같은 종착지).
    await expect(page).toHaveURL(/\/editor\/w-main/)
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인", ifNone: true })
  })

  test("프로젝트 여러 개 + 전체 탭 진입 → 기존 프로젝트 선택 → 그 프로젝트로 연결(중복 생성 없음)", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page, { extraProducts: [PRODUCT2] })
    await page.goto("/")

    // 프로젝트 2개 → 자동 선택 안 됨 → '전체' 탭(미선택)이 기본.
    await page.getByRole("button", { name: "코드 연결하기" }).click()

    // 새 프로젝트 직행이 아니라 기존 프로젝트를 고르는 단계가 뜬다(중복 생성 방지).
    const picker = page.getByRole("dialog")
    await expect(picker.getByText("어느 프로젝트에 연결할까요?")).toBeVisible()
    await picker.getByRole("button", { name: PRODUCT.name }).click()

    // 고른 프로젝트로 연결 모달 → 연결 → 에디터 직행.
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("이미 코드가 있어요")).toBeVisible()
    await openAdvancedJson(dialog)
    await dialog.getByLabel("코드 정보 JSON").fill(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    await dialog.getByRole("button", { name: "연결하기" }).click()
    await expect(page).toHaveURL(/\/editor\/w-main/)

    // 새 제품을 만들지 않았다 — 고른 기존 프로젝트(p1)로 연결됐다.
    expect(captured.productName).toBeUndefined()
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인", ifNone: true })
  })
})

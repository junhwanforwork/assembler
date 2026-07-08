import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 코드 연결 (ASM-026 → ASM-062 개편) — "이미 코드가 있어요" 3경로:
// ① 내 폴더 선택 ② 깃 주소(repo-scan) ③ JSON 직접 넣기(고급 접기, 기존 경로).
// 폴더·깃은 미리보기(찾은 개수 + 차단·스킵 정직 안내)를 거쳐 연결한다.
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

// 레인 2 계약(POST /api/repo-scan)의 성공 응답 모킹 — 요청 body(gitUrl)를 캡처해 와이어 검증.
type ExtractResultLike = {
  payload: { apis: unknown[]; tables: unknown[] }
  report: { scannedCount: number; blockedPaths: string[]; skippedPaths: string[] }
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

test.describe("수동 싱크-인 (ASM-026)", () => {
  test("붙여넣기 → 연결 → 메인 스펙 자동 생성 + 코드 기반 카피 전환", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    // 코드-진실이 없는 동안은 일반 카피 — 과약속 금지(C-4).
    await expect(page.getByText("적어 준 아이디어를 선택한 프로젝트의 연결된 구조로 펼쳐 드려요.")).toBeVisible()

    // 진입 → 모달 → 고급(JSON) 펼치기 → 붙여넣기 → 연결하기.
    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
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
    // ifNone(ASM-027) — 존재 판정은 서버가 한 요청 안에서. 클라 GET→POST check-then-act 제거.
    expect(captured.workspaceBody).toEqual({ productId: "p1", name: "메인", ifNone: true })
  })

  test("잘못된 행은 몇 번째가 왜 거부됐는지 보여주고 전송하지 않는다", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
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

  test("부분 실패(API 성공·테이블 실패) → 사실 그대로 안내 → 재시도로 완결", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page, { tablesFailOnce: true })
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await openAdvancedJson(dialog)
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

test.describe("코드 연결 3경로 (ASM-062)", () => {
  test("깃 주소 → 레포 스캔 → 미리보기(개수+차단 안내) → 연결 와이어 검증", async ({ page }) => {
    await seedSession(page)
    const captured = await mockSyncApis(page)
    const scan = await mockRepoScan(page, {
      payload: { apis: [API_ROW], tables: [TABLE_ROW] },
      report: { scannedCount: 4, blockedPaths: [".env"], skippedPaths: [] },
    })
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("깃 주소").fill("https://github.com/acme/walks")
    await dialog.getByRole("button", { name: "가져오기" }).click()

    // 미리보기 — 찾은 개수 + 차단 정직 안내(파일명은 접힘). 요청 body는 {gitUrl} 계약 그대로.
    await expect(dialog.getByText("API 1개 · 테이블 1개를 찾았어요.")).toBeVisible()
    await expect(dialog.getByText("1개 파일은 안전을 위해 읽지 않았어요")).toBeVisible()
    expect(scan.body).toEqual({ gitUrl: "https://github.com/acme/walks" })

    // 연결하기 → 기존 submit 경로 그대로(서버 계약 body) → 메인 자동 생성 토스트.
    await dialog.getByRole("button", { name: "연결하기" }).click()
    await expect(page.getByText("코드를 연결하고 메인 스펙을 만들었어요")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    expect(captured.apisBody).toEqual({ apis: [API_ROW] })
    expect(captured.tablesBody).toEqual({ tables: [TABLE_ROW] })
  })

  test("폴더 선택 → 차단 파일은 읽지 않고 → 0개 정직 안내(빈 연결 금지)", async ({ page }) => {
    await seedSession(page)
    await mockSyncApis(page)
    await page.goto("/")

    await page.getByRole("button", { name: "이미 코드가 있어요" }).click()
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

import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 정책 문서(ASM-069) — 작성형 문서 CRUD + 참조 API·DB 호버 해석 배선 검증.
// AI/DB 실호출 0 원칙: workspace·design·apis·db-tables·policy-docs·note 전부 page.route 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

const DESIGN = {
  requirements: [],
  features: [],
  pages: [],
  flows: [],
  wireframes: [],
  elements: [],
}

const APIS = [
  {
    id: "api-1",
    productId: "p1",
    method: "POST",
    endpoint: "/api/walks",
    summary: "산책 기록 저장",
    status: "active",
    source: "code",
  },
]

const DB_TABLES = [
  {
    id: "t1",
    productId: "p1",
    name: "walks",
    description: "산책 기록",
    columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
    source: "code",
  },
]

// API 해석 노트(ASM-064 계약) — 정책 문서 참조 칩 호버에서 재사용. GET 전용.
const API_NOTE = {
  id: "an1",
  apiId: "api-1",
  productId: "p1",
  explanation: "산책 한 건을 저장하는 엔드포인트예요",
  pros: ["기록이 한 곳에 모여요"],
  cons: ["대량 저장은 따로 처리해야 해요"],
  grounded: true,
  isUserEdited: false,
  generatedAt: "2026-07-01T00:00:00Z",
}

// DB 테이블 해석 노트 — DB 참조 칩 호버(TableRefTip)에서 재사용. GET 전용.
const DB_NOTE = {
  id: "dn1",
  dbTableId: "t1",
  productId: "p1",
  explanation: "산책 한 번이 한 줄로 저장돼요",
  pros: ["산책 기록이 한 곳에 모여요"],
  cons: ["산책 코스 정보는 따로 없어요"],
  grounded: true,
  isUserEdited: false,
  generatedAt: "2026-07-01T00:00:00Z",
}

type Counters = {
  noteGet: number
  noteGenerate: number
  dbNoteGet: number
  dbNoteGenerate: number
  policyPost: number
  policyPatch: number
}

async function mockPolicyApis(page: Page): Promise<{ counters: Counters }> {
  const counters: Counters = {
    noteGet: 0,
    noteGenerate: 0,
    dbNoteGet: 0,
    dbNoteGenerate: 0,
    policyPost: 0,
    policyPatch: 0,
  }
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: DESIGN }) })
  )
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: APIS }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: DB_TABLES }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )

  // 정책 문서 목록 — 서버 사이드 저장을 흉내내 in-memory로 누적(생성이 목록에 반영되는지 검증).
  const store: Record<string, unknown>[] = []
  await page.route("**/api/products/p1/policy-docs", (route) => {
    const method = route.request().method()
    if (method === "POST") {
      counters.policyPost += 1
      const input = route.request().postDataJSON() as {
        title: string
        body?: string
        apiIds?: string[]
        dbTableIds?: string[]
      }
      const doc = {
        id: "pd-1",
        productId: "p1",
        title: input.title,
        body: input.body ?? "",
        apiIds: input.apiIds ?? [],
        dbTableIds: input.dbTableIds ?? [],
        createdAt: "2026-07-09T00:00:00Z",
        updatedAt: "2026-07-09T00:00:00Z",
      }
      store.push(doc)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ doc }) })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ docs: store }) })
  })
  await page.route("**/api/products/p1/policy-docs/pd-1", (route) => {
    const method = route.request().method()
    if (method === "DELETE") {
      const idx = store.findIndex((d) => d.id === "pd-1")
      if (idx >= 0) store.splice(idx, 1)
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    }
    counters.policyPatch += 1
    const patch = route.request().postDataJSON() as Record<string, unknown>
    const existing = store.find((d) => d.id === "pd-1") ?? {}
    const doc = { ...existing, ...patch, updatedAt: "2026-07-09T01:00:00Z" }
    const idx = store.findIndex((d) => d.id === "pd-1")
    if (idx >= 0) store[idx] = doc
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ doc }) })
  })

  // API 해석 노트 — GET만 채운다. POST(유료 생성)가 오면 카운터로 잡아 "호버 유료 발사 0"을 강제한다.
  await page.route("**/api/workspaces/f1/apis/api-1/note", (route) => {
    if (route.request().method() === "POST") {
      counters.noteGenerate += 1
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "should_not_fire" }) })
    }
    counters.noteGet += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ note: API_NOTE }) })
  })

  // DB 테이블 해석 노트 — API와 동일하게 GET만. 정책 문서 DB 참조 호버에서도 유료 생성 0을 강제한다.
  await page.route("**/api/workspaces/f1/db-tables/t1/note", (route) => {
    if (route.request().method() === "POST") {
      counters.dbNoteGenerate += 1
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "should_not_fire" }) })
    }
    counters.dbNoteGet += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ note: DB_NOTE }) })
  })

  return { counters }
}

test.describe("정책 문서 (ASM-069)", () => {
  test("좌 레일 진입 → 새 문서 작성·저장 → 참조 API 선택 → 본문 호버 해석 → md 다운로드", async ({ page }) => {
    await seedSession(page)
    const { counters } = await mockPolicyApis(page)
    await page.goto("/editor/f1")

    const rail = page.getByRole("complementary")
    await expect(rail.getByText("정책 문서", { exact: true })).toBeVisible()

    // 새 정책 문서 진입 — 빈 편집기(새 문서 모드).
    await rail.getByRole("button", { name: "＋ 새 정책 문서" }).click()
    await expect(page.getByRole("button", { name: "만들기" })).toBeVisible()

    // 제목·본문 작성 후 만들기(POST) → 편집 모드로 전환(저장하기 버튼 등장).
    await page.getByLabel("정책 문서 제목").fill("개인정보 처리방침")
    await page.getByLabel("정책 문서 본문").fill("이 서비스는 산책 기록을 저장해요.")
    await page.getByRole("button", { name: "만들기" }).click()
    await expect(page.getByRole("button", { name: "저장하기" })).toBeVisible()
    expect(counters.policyPost).toBe(1)

    // 좌 레일 목록에 새 문서가 반영된다(브리지 공유 store).
    await expect(rail.getByRole("button", { name: "개인정보 처리방침" })).toBeVisible()

    // 참조 API·DB 선택(코드-진실 목록에서 — API 라벨은 메서드 포함) → 저장(PATCH).
    await page.getByRole("button", { name: "POST /api/walks", pressed: false }).click()
    await page.getByRole("button", { name: "walks", pressed: false }).click()
    await page.getByRole("button", { name: "저장하기" }).click()
    await expect.poll(() => counters.policyPatch).toBe(1)

    // API 참조 칩 호버 → 12차 해석 카드(설명·좋은 점) 노출. 유료 생성은 발사되지 않는다.
    await page.getByText("/api/walks").last().hover()
    const apiTip = page.getByRole("tooltip")
    await expect(apiTip.getByText("산책 한 건을 저장하는 엔드포인트예요")).toBeVisible()
    await expect(apiTip.getByText("기록이 한 곳에 모여요")).toBeVisible()
    expect(counters.noteGet).toBeGreaterThan(0)
    expect(counters.noteGenerate).toBe(0)

    // DB 참조 칩 호버 → TableRefTip 해석 카드 노출. DB 경로에서도 유료 생성 발사 0.
    await page.getByText("walks", { exact: true }).last().hover()
    await expect(page.getByRole("tooltip").getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    expect(counters.dbNoteGet).toBeGreaterThan(0)
    expect(counters.dbNoteGenerate).toBe(0)

    // md 다운로드 — 저장된 본문 그대로 파일로. 파일명은 제목 기반.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "md로 받기" }).click(),
    ])
    expect(download.suggestedFilename()).toBe("개인정보 처리방침.md")
  })

  test("삭제는 확인 다이얼로그를 거친다 — 닫기는 유지, 영구 삭제하기는 목록에서 제거", async ({ page }) => {
    await seedSession(page)
    await mockPolicyApis(page)
    await page.goto("/editor/f1")

    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: "＋ 새 정책 문서" }).click()
    await page.getByLabel("정책 문서 제목").fill("삭제 대상 문서")
    await page.getByRole("button", { name: "만들기" }).click()
    await expect(rail.getByRole("button", { name: "삭제 대상 문서" })).toBeVisible()

    // 삭제하기 = 즉시 삭제가 아니라 확인 다이얼로그(button.md — 바로 삭제 금지).
    await page.getByRole("button", { name: "삭제하기" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("이 정책 문서를 삭제할까요?")).toBeVisible()

    // 닫기 = 취소 — 문서는 목록에 그대로 남는다.
    await dialog.getByRole("button", { name: "닫기" }).click()
    await expect(dialog).toBeHidden()
    await expect(rail.getByRole("button", { name: "삭제 대상 문서" })).toBeVisible()

    // 다시 열어 영구 삭제하기 → 목록에서 사라지고 편집기도 닫힌다(새 문서 모드로 복귀).
    await page.getByRole("button", { name: "삭제하기" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "영구 삭제하기" }).click()
    await expect(rail.getByRole("button", { name: "삭제 대상 문서" })).toBeHidden()
  })
})

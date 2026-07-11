import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// AI 제안 3dot 메뉴(ASM-081) — 상시 우패널 카드를 아이템(요구사항·기능) 3dot 메뉴 호출로 전환.
// 검증: (1) 유료 생성은 명시 버튼("분석하기")에서만 발사(메뉴 열기만으론 0), (2) 제안 목록의 jump·dismiss,
// (3) 팝오버를 닫았다 다시 열어도 결과 유지(store 캐시). AI 실호출 0 — /suggestions는 결정적 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "로그인 스펙", isMain: true }

function makeDesign() {
  return {
    requirements: [
      {
        id: "req-1",
        title: "인증",
        description: "사용자는 로그인할 수 있다",
        status: "approved",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["이메일로 로그인할 수 있다"],
      },
    ],
    features: [
      {
        id: "feat-1",
        name: "로그인 기능",
        description: "이메일·비밀번호 로그인",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: ["page-1"],
        apiIds: ["api-1"],
        dbTableIds: ["db-1"],
      },
      {
        id: "feat-2",
        name: "회원가입 기능",
        description: "",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
      },
    ],
    pages: [],
    flows: [],
    wireframes: [],
    elements: [],
  }
}

// 제안 2건 — s1은 feat-2(회원가입 기능)로 점프 가능, s2는 타깃 없음(dismiss용).
const SUGGESTIONS = [
  {
    id: "sug-1",
    kind: "improvement",
    title: "회원가입 흐름 점검",
    detail: "가입 완료 후 이동을 확인해요",
    targetType: "feature",
    targetId: "feat-2",
  },
  {
    id: "sug-2",
    kind: "gap",
    title: "비밀번호 규칙 공백",
    detail: "정책이 비어 있어요",
    targetType: null,
    targetId: null,
  },
]

// /suggestions 호출 횟수를 반환 — 명시 트리거 1곳(자동 발사 없음)을 카운트로 단언한다.
async function mockEditorApis(page: Page): Promise<{ count: () => number }> {
  const current = makeDesign()
  let suggestionsCalls = 0
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: current }) })
  )
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: [] }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: [] }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) => {
    suggestionsCalls += 1
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ suggestions: SUGGESTIONS }),
    })
  })
  return { count: () => suggestionsCalls }
}

async function openEditor(page: Page): Promise<{ count: () => number }> {
  await seedSession(page)
  const meter = await mockEditorApis(page)
  await page.goto("/editor/f1")
  await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()
  return meter
}

// 3dot 트리거는 종류(요구사항·기능)로 라벨링돼 여러 개가 같은 이름을 갖는다 — 어느 아이템인지는
// 테이블 행(role=row) 맥락으로 스코프한다. 제안 내용은 워크스페이스 스코프라 어느 행에서 꺼내도 동일.
async function openTableView(page: Page): Promise<void> {
  await page.getByRole("group", { name: "명세 보기" }).getByRole("button", { name: "테이블" }).click()
  await expect(page.getByRole("columnheader", { name: "기능명" })).toBeVisible()
}

function featureMenuTrigger(page: Page, featureName: string) {
  return page
    .getByRole("row")
    .filter({ hasText: featureName })
    .getByRole("button", { name: "기능 AI 제안 열기" })
}

test.describe("AI 제안 3dot 메뉴 (ASM-081)", () => {
  test("요구사항 행에도 3dot 메뉴가 있다 — 열면 AI 제안 메뉴가 뜬다(디렉토리 뷰)", async ({ page }) => {
    await openEditor(page)

    // 요구사항 컬럼(디렉토리) — '인증' 요구사항 행의 3dot. 요구사항은 하나뿐이라 트리거도 유일.
    await page.getByRole("button", { name: "요구사항 AI 제안 열기" }).click()
    await expect(page.getByRole("dialog", { name: "요구사항 AI 제안 메뉴" })).toBeVisible()
  })

  test("메뉴 열기만으론 유료 호출 0 — 명시 '분석하기'에서만 1회 발사", async ({ page }) => {
    const meter = await openEditor(page)
    await openTableView(page)

    // 기능 '로그인 기능' 행의 3dot 열기 — 이 자체로는 유료 호출이 없어야 한다.
    await featureMenuTrigger(page, "로그인 기능").click()
    const menu = page.getByRole("dialog", { name: "기능 AI 제안 메뉴" })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole("button", { name: "분석하기", exact: true })).toBeVisible()
    expect(meter.count()).toBe(0)

    // 명시 트리거 — 여기서만 유료 발사(1회).
    await menu.getByRole("button", { name: "분석하기", exact: true }).click()
    await expect(menu.getByText("회원가입 흐름 점검")).toBeVisible()
    await expect(menu.getByText("비밀번호 규칙 공백")).toBeVisible()
    expect(meter.count()).toBe(1)
  })

  test("닫았다 다시 열어도 제안 결과가 유지된다(store 캐시) — 재발사 없음", async ({ page }) => {
    const meter = await openEditor(page)
    await openTableView(page)

    await featureMenuTrigger(page, "로그인 기능").click()
    const menu = page.getByRole("dialog", { name: "기능 AI 제안 메뉴" })
    await menu.getByRole("button", { name: "분석하기", exact: true }).click()
    await expect(menu.getByText("회원가입 흐름 점검")).toBeVisible()
    expect(meter.count()).toBe(1)

    // 팝오버 닫기 — content 언마운트.
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()

    // 다시 열기 — idle('분석하기')이 아니라 loaded 결과가 바로 보인다(로컬 state였다면 유실).
    await featureMenuTrigger(page, "로그인 기능").click()
    await expect(menu.getByText("회원가입 흐름 점검")).toBeVisible()
    await expect(menu.getByRole("button", { name: "분석하기", exact: true })).toHaveCount(0)
    // 재발사 없음 — 유료 호출은 여전히 1회.
    expect(meter.count()).toBe(1)
  })

  test("제안 dismiss — 닫은 제안은 목록에서 사라진다", async ({ page }) => {
    await openEditor(page)
    await openTableView(page)

    await featureMenuTrigger(page, "로그인 기능").click()
    const menu = page.getByRole("dialog", { name: "기능 AI 제안 메뉴" })
    await menu.getByRole("button", { name: "분석하기", exact: true }).click()
    await expect(menu.getByText("비밀번호 규칙 공백")).toBeVisible()

    // 타깃 없는 제안(s2)을 닫는다 — 그 항목만 사라지고 s1은 남는다.
    const s2 = menu.getByRole("listitem").filter({ hasText: "비밀번호 규칙 공백" })
    await s2.getByRole("button", { name: "제안 닫기" }).click()
    await expect(menu.getByText("비밀번호 규칙 공백")).toHaveCount(0)
    await expect(menu.getByText("회원가입 흐름 점검")).toBeVisible()
  })

  test("제안 jump — 타깃 클릭이 해당 기능 상세로 데려간다", async ({ page }) => {
    await openEditor(page)
    await openTableView(page)

    await featureMenuTrigger(page, "로그인 기능").click()
    const menu = page.getByRole("dialog", { name: "기능 AI 제안 메뉴" })
    await menu.getByRole("button", { name: "분석하기", exact: true }).click()

    // s1의 타깃 칩(회원가입 기능) 클릭 → useSpecJump가 feat-2 선택 → 상세 플로팅(자동 오픈)이 뜬다.
    await menu.getByRole("button", { name: "회원가입 기능" }).click()
    const detail = page.getByRole("dialog", { name: "상세" })
    await expect(detail).toBeVisible()
    await expect(detail.getByText("회원가입 기능")).toBeVisible()
  })
})

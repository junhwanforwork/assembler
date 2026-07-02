import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 편집성 인터랙션 1차 (ASM-025) — #30 요구사항 추가 · #32 체크박스 · #34 벌크바 · #37 수용기준 · #42 상세기능.
// AI 호출 0 원칙: design GET/PATCH를 스테이트풀 모킹(머지 계약 재현)으로 검증.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

function makeDesign() {
  return {
    requirements: [
      {
        id: "req-1",
        title: "산책 기록",
        description: "사용자는 산책을 기록할 수 있다",
        status: "draft",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["산책 시작을 누를 수 있다"],
      },
      {
        id: "req-2",
        title: "산책 공유",
        description: "",
        status: "draft",
        priority: "low",
        role: "",
        acceptanceCriteria: [],
      },
    ],
    features: [
      {
        id: "feat-1",
        name: "산책 기록 화면",
        description: "기록 시작·종료",
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

// 스테이트풀 design 모킹 — PATCH의 "준 컬렉션은 통째 교체" 머지 계약을 그대로 재현해
// 저장 후 GET(#patchDesignScoped의 최신 GET 선행)도 일관된 그래프를 돌려준다.
async function mockEditorApis(page: Page): Promise<{ patched: Record<string, unknown>[] }> {
  const captured = { patched: [] as Record<string, unknown>[] }
  let current = makeDesign()
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      captured.patched.push(body)
      current = { ...current, ...(body as Partial<ReturnType<typeof makeDesign>>) }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: true, design: current }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: current }) })
  })
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: [] }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: [] }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )
  return captured
}

async function openEditor(page: Page): Promise<{ patched: Record<string, unknown>[] }> {
  await seedSession(page)
  const captured = await mockEditorApis(page)
  await page.goto("/editor/f1")
  await expect(page.getByText("제품 구조")).toBeVisible()
  return captured
}

test.describe("편집성 인터랙션 (ASM-025)", () => {
  test("#30 — ＋ 요구사항 추가: 인라인 제목 → PATCH(기본값) → 목록 추가+선택+'연결 안 됨'", async ({ page }) => {
    const captured = await openEditor(page)

    // 미연결 요구사항(req-2)은 처음부터 '연결 안 됨' 표시.
    await expect(page.getByText("연결 안 됨")).toHaveCount(1)

    await page.getByRole("button", { name: "요구사항 추가" }).click()
    const input = page.getByLabel("새 요구사항 제목")
    await input.fill("산책 알림")
    await input.press("Enter")

    // 스코프드 PATCH — requirements만, 새 항목은 #30 기본값(draft·medium·역할 빈 값).
    await expect(page.getByRole("button", { name: /산책 알림/ })).toBeVisible()
    expect(captured.patched).toHaveLength(1)
    const body = captured.patched[0] as { requirements?: Record<string, unknown>[] }
    expect(Object.keys(body)).toEqual(["requirements"])
    const added = body.requirements?.at(-1)
    expect(added).toMatchObject({ title: "산책 알림", status: "draft", priority: "medium", role: "" })

    // 목록 추가+선택 — 우패널 인스펙터가 새 요구사항을 비춘다.
    await expect(page.locator("aside").getByText("산책 알림")).toBeVisible()
    // 생성 직후 '연결 안 됨' — 기존 req-2와 합쳐 2개.
    await expect(page.getByText("연결 안 됨")).toHaveCount(2)
  })

  test("#32·#33·#34 — 체크박스 → 벌크바 → 상태·역할 일괄 PATCH 1회 + 내보내기 '곧' 비활성", async ({ page }) => {
    const captured = await openEditor(page)

    await page.getByLabel("산책 기록 선택").check()
    await page.getByLabel("산책 공유 선택").check()
    await expect(page.getByText("개 선택됨")).toHaveText("2개 선택됨")

    // 내보내기 — 비활성 사유가 있는 표면(#64 모달 전 "곧"). 상단바 내보내기(#9)와 구분해 벌크바 스코프.
    await expect(page.getByRole("main").getByRole("button", { name: "내보내기" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )

    // 상태 일괄 변경 = PATCH 1회.
    await page.getByLabel("상태 일괄 변경").click()
    await page.getByRole("option", { name: "승인됨으로" }).click()
    await expect(page.getByText("적용했어요")).toBeVisible()
    expect(captured.patched).toHaveLength(1)
    const statusBody = captured.patched[0] as { requirements?: { id: string; status: string }[] }
    expect(Object.keys(statusBody)).toEqual(["requirements"])
    expect(statusBody.requirements?.map((r) => r.status)).toEqual(["approved", "approved"])

    // 역할 일괄 지정 = PATCH 1회 더.
    await page.getByRole("button", { name: "역할 지정" }).click()
    const roleInput = page.getByLabel("역할 일괄 지정")
    await roleInput.fill("보호자")
    await roleInput.press("Enter")
    await expect(page.getByText("적용했어요")).toBeVisible()
    expect(captured.patched).toHaveLength(2)
    const roleBody = captured.patched[1] as { requirements?: { role: string }[] }
    expect(roleBody.requirements?.map((r) => r.role)).toEqual(["보호자", "보호자"])

    // ✕ 전체 해제(#33) → 벌크바 닫힘.
    await page.getByRole("button", { name: "선택 해제" }).click()
    await expect(page.getByText("개 선택됨")).toHaveCount(0)
  })

  test("#37·#42 — 인스펙터에서 수용 기준·상세 기능 인라인 추가(빈 문자열=취소)", async ({ page }) => {
    const captured = await openEditor(page)

    // 요구사항 선택 → 인스펙터 RequirementPanel.
    await page.getByRole("button", { name: /산책 기록/ }).first().click()
    await expect(page.locator("aside").getByText("수용 기준")).toBeVisible()

    // 빈 문자열 커밋 = 취소 — PATCH가 나가지 않는다(#37 계약).
    await page.getByRole("button", { name: "수용 기준 추가" }).click()
    await page.getByLabel("새 수용 기준").press("Enter")
    await expect(page.getByLabel("새 수용 기준")).toHaveCount(0)
    expect(captured.patched).toHaveLength(0)

    // 실제 추가 → requirements 스코프드 PATCH.
    await page.getByRole("button", { name: "수용 기준 추가" }).click()
    const acInput = page.getByLabel("새 수용 기준")
    await acInput.fill("산책 종료 시 거리를 저장한다")
    await acInput.press("Enter")
    await expect(page.locator("aside").getByText("산책 종료 시 거리를 저장한다")).toBeVisible()
    expect(captured.patched).toHaveLength(1)
    const acBody = captured.patched[0] as { requirements?: { id: string; acceptanceCriteria: string[] }[] }
    expect(Object.keys(acBody)).toEqual(["requirements"])
    expect(acBody.requirements?.find((r) => r.id === "req-1")?.acceptanceCriteria).toEqual([
      "산책 시작을 누를 수 있다",
      "산책 종료 시 거리를 저장한다",
    ])

    // 기능 선택 → FeaturePanel → 상세 기능 추가(#42) → features 스코프드 PATCH.
    await page.getByRole("button", { name: /산책 기록 화면/ }).first().click()
    await page.getByRole("button", { name: "상세 기능 추가" }).click()
    const detailInput = page.getByLabel("새 상세 기능")
    await detailInput.fill("경로 지도 표시")
    await detailInput.press("Enter")
    await expect(page.locator("aside").getByText("경로 지도 표시")).toBeVisible()
    expect(captured.patched).toHaveLength(2)
    const detailBody = captured.patched[1] as {
      features?: { id: string; detailFeatures: { title: string; description: string }[] }[]
    }
    expect(Object.keys(detailBody)).toEqual(["features"])
    expect(detailBody.features?.find((f) => f.id === "feat-1")?.detailFeatures).toMatchObject([
      { title: "경로 지도 표시", description: "" },
    ])
  })
})

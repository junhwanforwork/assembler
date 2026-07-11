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

const DANGLING_REFS = [{ from: "feature:feat-1", field: "requirementIds", missingId: "req-x", kind: "requirement" }]

// 스테이트풀 design 모킹 — PATCH의 "준 컬렉션은 통째 교체" 머지 계약을 그대로 재현해
// 저장 후 GET(#patchDesignScoped의 최신 GET 선행)도 일관된 그래프를 돌려준다.
// patchPlan: n번째 PATCH의 응답 시나리오("conflict"=409 CAS, "dangling"=409 refs). 소진 후엔 정상 저장.
async function mockEditorApis(
  page: Page,
  patchPlan: ("conflict" | "dangling")[] = []
): Promise<{ patched: Record<string, unknown>[] }> {
  const captured = { patched: [] as Record<string, unknown>[] }
  const plan = [...patchPlan]
  let current = makeDesign()
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      captured.patched.push(body)
      const scenario = plan.shift()
      if (scenario === "conflict") {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "conflict" }),
        })
      }
      if (scenario === "dangling") {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "dangling_refs", refs: DANGLING_REFS }),
        })
      }
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

async function openEditor(
  page: Page,
  patchPlan: ("conflict" | "dangling")[] = []
): Promise<{ patched: Record<string, unknown>[] }> {
  await seedSession(page)
  const captured = await mockEditorApis(page, patchPlan)
  await page.goto("/editor/f1")
  await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()
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
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("산책 알림")).toBeVisible()
    // 생성 직후 '연결 안 됨' — 기존 req-2와 합쳐 2개.
    await expect(page.getByText("연결 안 됨")).toHaveCount(2)
  })

  test("#32·#33·#34 — 체크박스 → 벌크바 → 상태·역할 일괄 PATCH 1회 + 내보내기 활성", async ({ page }) => {
    const captured = await openEditor(page)

    await page.getByLabel("산책 기록 선택").check()
    await page.getByLabel("산책 공유 선택").check()
    await expect(page.getByText("개 선택됨")).toHaveText("2개 선택됨")

    // 내보내기 — #64 모달 배선(ASM-030)으로 활성. 모달 플로우 자체는 export.spec.ts 소유.
    await expect(page.getByRole("main").getByRole("button", { name: "내보내기" })).toBeEnabled()

    // 상태 일괄 변경 = PATCH 1회. 성공하면 체크 해제(바 닫힘) + 노티스.
    await page.getByLabel("상태 일괄 변경").click()
    await page.getByRole("option", { name: "승인됨으로" }).click()
    await expect(page.getByText("2개에 적용했어요")).toBeVisible()
    await expect(page.getByText("개 선택됨")).toHaveCount(0)
    expect(captured.patched).toHaveLength(1)
    const statusBody = captured.patched[0] as { requirements?: { id: string; status: string }[] }
    expect(Object.keys(statusBody)).toEqual(["requirements"])
    expect(statusBody.requirements?.map((r) => r.status)).toEqual(["approved", "approved"])

    // 역할 일괄 지정 = PATCH 1회 더 (재선택 후).
    await page.getByLabel("산책 기록 선택").check()
    await page.getByLabel("산책 공유 선택").check()
    await page.getByRole("button", { name: "역할 지정하기" }).click()
    const roleInput = page.getByLabel("역할 일괄 지정")
    await roleInput.fill("보호자")
    await roleInput.press("Enter")
    await expect(page.getByText("2개에 적용했어요")).toBeVisible()
    expect(captured.patched).toHaveLength(2)
    const roleBody = captured.patched[1] as { requirements?: { role: string }[] }
    expect(roleBody.requirements?.map((r) => r.role)).toEqual(["보호자", "보호자"])

    // ✕ 전체 해제(#33) → 벌크바 닫힘, 저장 없음.
    await page.getByLabel("산책 기록 선택").check()
    await page.getByRole("button", { name: "선택 해제" }).click()
    await expect(page.getByText("개 선택됨")).toHaveCount(0)
    expect(captured.patched).toHaveLength(2)
  })

  test("409 conflict → 최신 GET 재적용 → 자동 재시도 1회로 성공", async ({ page }) => {
    const captured = await openEditor(page, ["conflict"])

    await page.getByRole("button", { name: "요구사항 추가" }).click()
    const input = page.getByLabel("새 요구사항 제목")
    await input.fill("산책 알림")
    await input.press("Enter")

    // 첫 PATCH는 409 — 사용자 개입 없이 재적용·재시도로 저장 완료.
    await expect(page.getByRole("button", { name: /산책 알림/ })).toBeVisible()
    expect(captured.patched).toHaveLength(2)
    const retried = captured.patched[1] as { requirements?: { title: string }[] }
    expect(retried.requirements?.at(-1)?.title).toBe("산책 알림")
    // 에러 노트 없음 — 재시도로 해소됐다. (Next dev 오버레이의 alert와 구분해 main 스코프)
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
  })

  test("409 dangling_refs → 끊어진 연결 상세 표시, 실패 후 바깥 클릭 = 포기(재발사 없음)", async ({ page }) => {
    const captured = await openEditor(page, ["dangling"])

    await page.getByRole("button", { name: "요구사항 추가" }).click()
    const input = page.getByLabel("새 요구사항 제목")
    await input.fill("산책 알림")
    await input.press("Enter")

    // dangling은 재시도 대상이 아니다 — refs 상세를 그대로 보여준다.
    await expect(page.getByText("끊어진 연결이 있어 저장할 수 없어요.")).toBeVisible()
    await expect(page.getByRole("main").getByRole("alert").getByText("req-x")).toBeVisible()
    expect(captured.patched).toHaveLength(1)

    // 실패 후 바깥 클릭은 같은 텍스트 재발사가 아니라 포기(취소).
    await input.click()
    await page.getByRole("complementary", { name: "AI 프롬프트" }).click()
    await expect(page.getByLabel("새 요구사항 제목")).toHaveCount(0)
    expect(captured.patched).toHaveLength(1)
  })

  test("#37·#42 — 인스펙터에서 수용 기준·상세 기능 인라인 추가(빈 문자열=취소)", async ({ page }) => {
    const captured = await openEditor(page)

    // 요구사항 선택 → 인스펙터 RequirementPanel.
    await page.getByRole("button", { name: /산책 기록/ }).first().click()
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("수용 기준")).toBeVisible()

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
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("산책 종료 시 거리를 저장한다")).toBeVisible()
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
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("경로 지도 표시")).toBeVisible()
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

// 명세 인라인 편집 (ASM-084) — 인스펙터 제목·설명 클릭 편집 → buildUpdate* 스코프드 PATCH.
// 기존 mockEditorApis 스테이트풀 모킹 재사용(AI·DB 실호출 0).
test.describe("명세 인라인 편집 (ASM-084)", () => {
  async function selectRequirement(page: Page) {
    await page.getByRole("button", { name: /산책 기록/ }).first().click()
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("수용 기준")).toBeVisible()
  }

  test("① 제목 클릭 → 편집 → Enter → PATCH 1회(제목 교체)", async ({ page }) => {
    const captured = await openEditor(page)
    const dialog = page.getByRole("dialog", { name: "상세" })
    await selectRequirement(page)

    await dialog.getByRole("button", { name: "요구사항 제목 편집" }).click()
    const input = dialog.getByLabel("요구사항 제목")
    await input.fill("산책 기록하기")
    await input.press("Enter")

    // 저장 성공 → 표시 모드 복원 + 새 제목 반영.
    await expect(dialog.getByText("산책 기록하기")).toBeVisible()
    expect(captured.patched).toHaveLength(1)
    const body = captured.patched[0] as { requirements?: { id: string; title: string }[] }
    expect(Object.keys(body)).toEqual(["requirements"])
    expect(body.requirements?.find((r) => r.id === "req-1")?.title).toBe("산책 기록하기")
  })

  test("② 설명을 빈 값으로 저장 → PATCH(지우기)", async ({ page }) => {
    const captured = await openEditor(page)
    const dialog = page.getByRole("dialog", { name: "상세" })
    await selectRequirement(page)

    await dialog.getByRole("button", { name: "요구사항 설명 편집" }).click()
    const textarea = dialog.getByLabel("요구사항 설명")
    await textarea.fill("")
    // 여러 줄 확정 = Cmd/Ctrl+Enter. 빈 값은 지우기(설명은 required 아님).
    await textarea.press("ControlOrMeta+Enter")

    await expect(dialog.getByText("설명이 아직 없어요.")).toBeVisible()
    expect(captured.patched).toHaveLength(1)
    const body = captured.patched[0] as { requirements?: { id: string; description: string }[] }
    expect(Object.keys(body)).toEqual(["requirements"])
    expect(body.requirements?.find((r) => r.id === "req-1")?.description).toBe("")
  })

  test("③ 빈 제목 저장 시도 → PATCH 0(취소·표시 복원)", async ({ page }) => {
    const captured = await openEditor(page)
    const dialog = page.getByRole("dialog", { name: "상세" })
    await selectRequirement(page)

    await dialog.getByRole("button", { name: "요구사항 제목 편집" }).click()
    const input = dialog.getByLabel("요구사항 제목", { exact: true })
    await input.fill("")
    await input.press("Enter")

    // 필수 필드라 빈 값은 되돌림 — 표시 모드 복원, 원래 제목 유지, 저장 없음.
    await expect(dialog.getByLabel("요구사항 제목", { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole("button", { name: "요구사항 제목 편집" })).toHaveText("산책 기록")
    expect(captured.patched).toHaveLength(0)
  })

  test("④ 무변경(같은 값)으로 확정 → PATCH 0", async ({ page }) => {
    const captured = await openEditor(page)
    const dialog = page.getByRole("dialog", { name: "상세" })
    await selectRequirement(page)

    await dialog.getByRole("button", { name: "요구사항 제목 편집" }).click()
    const input = dialog.getByLabel("요구사항 제목", { exact: true })
    // 값 그대로 Enter — 무변경 스킵으로 PATCH가 나가지 않는다.
    await input.press("Enter")

    await expect(dialog.getByLabel("요구사항 제목", { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole("button", { name: "요구사항 제목 편집" })).toHaveText("산책 기록")
    expect(captured.patched).toHaveLength(0)
  })
})
